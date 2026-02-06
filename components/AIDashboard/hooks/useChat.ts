/**
 * useChat - 聊天消息管理钩子
 * 处理消息发送、接收、流式响应等逻辑
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { api } from '../../../services/api';
import { ChatMessage } from '../../../types';
import { indexedDB } from '../../../services/indexedDB';

// 消息角色类型
export type MessageRole = 'user' | 'model';

// 发送消息参数
export interface SendMessageParams {
  text: string;
  attachments?: Array<{
    type: string;
    name: string;
    url?: string;
    content?: string;
  }>;
  files?: File[]; // 新增：原始文件列表，用于上传
  conversationId?: string;
  modelId?: string;
  assistantId?: string;
  systemPrompt?: string;
}

// 流式响应状态
export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  progress: number;
}

interface UseChatOptions {
  onMessageSent?: (message: ChatMessage) => void;
  onStreamChunk?: (chunk: string, fullText: string) => void;
  onStreamComplete?: (response: ChatMessage) => void;
  onError?: (error: Error) => void;
}

interface UseChatReturn {
  // 消息状态
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  streaming: StreamingState;

  // 消息操作
  sendMessage: (params: SendMessageParams) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
  deleteMessage: (index: number) => void;
  editMessage: (index: number, newText: string) => void;
  regenerateMessage: (index: number) => Promise<void>;

  // 书签操作
  bookmarkedMessages: Set<number>;
  toggleBookmark: (index: number) => void;
  clearBookmarks: () => void;

  // 选择操作
  selectedMessages: Set<number>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  // 工具函数
  getMessageById: (id: string) => ChatMessage | undefined;
  findLastModelMessageIndex: () => number;
  exportMessages: (format: 'json' | 'markdown' | 'txt') => string;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onMessageSent, onStreamChunk, onStreamComplete, onError } = options;

  // 消息状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    progress: 0,
  });

  // 书签和选择状态
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<number>>(new Set());
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());

  // 流式响应控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 清理 Blob URLs 和取消进行中的请求
  useEffect(() => {
    return () => {
      // 组件卸载时取消进行中的请求
      abortControllerRef.current?.abort();
      
      // 释放所有 Blob URLs 防止内存泄漏
      messages.forEach(msg => {
        msg.attachments?.forEach(att => {
          if (att.url?.startsWith('blob:')) {
            URL.revokeObjectURL(att.url);
          }
        });
      });
    };
  }, [messages]);

  // 发送消息
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    const { text, attachments, files, conversationId, modelId, assistantId, systemPrompt } = params;

    if (!text.trim() && (!attachments || attachments.length === 0) && (!files || files.length === 0)) {
      return;
    }

    // 并行上传文件获取附件ID（性能优化）
    let attachmentIds: string[] = [];
    if (files && files.length > 0) {
      console.log('[useChat] Uploading', files.length, 'files in parallel...');
      const uploadPromises = files.map(async (file) => {
        try {
          const result = await api.uploadAIAttachment(file);
          if (result.success && result.data?.id) {
            console.log('[useChat] File uploaded, ID:', result.data.id);
            return result.data.id;
          }
        } catch (error) {
          console.error('[useChat] Failed to upload file:', file.name, error);
        }
        return null;
      });
      
      const results = await Promise.all(uploadPromises);
      attachmentIds = results.filter((id): id is string => id !== null);
      console.log('[useChat] Total attachmentIds:', attachmentIds);
    }

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
      attachments: files?.map(f => ({
        type: f.type,
        name: f.name,
        url: URL.createObjectURL(f),
      })),
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    onMessageSent?.(userMessage);

    // 开始加载
    setIsLoading(true);
    setStreaming({ isStreaming: true, currentText: '', progress: 0 });

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 准备历史消息
      const historyMessages = messages.map(m => ({
        role: m.role,
        content: m.text,
      }));

      // 添加当前用户消息
      historyMessages.push({
        role: 'user',
        content: text.trim(),
      });

      // 发送 API 请求（包含附件ID）- 使用流式端点
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3215'}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          messages: historyMessages,
          options: {
            model: modelId,
          },
          assistantId,
          systemPrompt,
          conversationId,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                  setStreaming(prev => ({
                    ...prev,
                    currentText: fullText,
                    progress: Math.min(prev.progress + 5, 95),
                  }));
                  onStreamChunk?.(parsed.text, fullText);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 创建 AI 响应消息
      const aiMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: fullText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      onStreamComplete?.(aiMessage);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消了请求
        console.log('Request aborted');
      } else {
        console.error('Chat error:', error);
        onError?.(error);
        
        // 添加错误消息
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'model',
          text: `发生错误: ${error.message}`,
          timestamp: new Date(),
          error: true,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreaming({ isStreaming: false, currentText: '', progress: 100 });
      abortControllerRef.current = null;
    }
  }, [messages, onMessageSent, onStreamChunk, onStreamComplete, onError]);

  // 停止流式响应
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 保存当前已流式输出的内容
    if (streaming.isStreaming && streaming.currentText) {
      const aiMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: streaming.currentText,
        timestamp: new Date(),
        stopped: true, // 标记为被用户停止
      };
      setMessages(prev => [...prev, aiMessage]);
      onStreamComplete?.(aiMessage);
    }

    setIsLoading(false);
    setStreaming({ isStreaming: false, currentText: '', progress: 0 });
  }, [streaming.isStreaming, streaming.currentText, onStreamComplete]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    setBookmarkedMessages(new Set());
    setSelectedMessages(new Set());
  }, []);

  // 删除单条消息
  const deleteMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
    
    // 更新书签和选择集合
    setBookmarkedMessages(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
    
    setSelectedMessages(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  }, []);

  // 编辑消息
  const editMessage = useCallback((index: number, newText: string) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, text: newText, editedAt: new Date() } : msg
    ));
  }, []);

  // 重新生成消息
  const regenerateMessage = useCallback(async (index: number) => {
    // 找到该消息之前的用户消息
    let userMessageIndex = index - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) {
      console.warn('No user message found to regenerate');
      return;
    }

    const userMessage = messages[userMessageIndex];
    
    // 删除从用户消息之后的所有消息
    setMessages(prev => prev.slice(0, userMessageIndex + 1));

    // 重新发送
    await sendMessage({
      text: userMessage.text,
      attachments: userMessage.attachments,
    });
  }, [messages, sendMessage]);

  // 书签操作
  const toggleBookmark = useCallback((index: number) => {
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarkedMessages(new Set());
  }, []);

  // 选择操作
  const toggleSelection = useCallback((index: number) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMessages(new Set(messages.map((_, i) => i)));
  }, [messages]);

  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedMessages.size === 0) return;
    
    const toDelete = Array.from(selectedMessages).sort((a, b) => b - a);
    setMessages(prev => prev.filter((_, i) => !selectedMessages.has(i)));
    setSelectedMessages(new Set());
    setBookmarkedMessages(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (!selectedMessages.has(i)) {
          const offset = toDelete.filter(d => d < i).length;
          newSet.add(i - offset);
        }
      });
      return newSet;
    });
  }, [selectedMessages]);

  // 工具函数
  const getMessageById = useCallback((id: string) => {
    return messages.find(m => m.id === id);
  }, [messages]);

  const findLastModelMessageIndex = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model') {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const exportMessages = useCallback((format: 'json' | 'markdown' | 'txt'): string => {
    switch (format) {
      case 'json':
        return JSON.stringify(messages, null, 2);
      case 'markdown':
        return messages.map((msg, i) => {
          const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 AI';
          return `### ${roleLabel}\n\n${msg.text}\n`;
        }).join('\n---\n\n');
      case 'txt':
        return messages.map(msg => {
          const roleLabel = msg.role === 'user' ? '用户' : 'AI';
          return `[${roleLabel}]\n${msg.text}`;
        }).join('\n\n');
      default:
        return '';
    }
  }, [messages]);

  return {
    // 消息状态
    messages,
    setMessages,
    isLoading,
    streaming,

    // 消息操作
    sendMessage,
    stopStreaming,
    clearMessages,
    deleteMessage,
    editMessage,
    regenerateMessage,

    // 书签操作
    bookmarkedMessages,
    toggleBookmark,
    clearBookmarks,

    // 选择操作
    selectedMessages,
    toggleSelection,
    selectAll,
    clearSelection,
    deleteSelected,

    // 工具函数
    getMessageById,
    findLastModelMessageIndex,
    exportMessages,
  };
}
