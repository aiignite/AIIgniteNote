
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, ChatMessage } from '../types';
import { api } from '../services/api';
import { indexedDB, STORES } from '../services/indexedDB';
import { useLanguageStore } from '../store/languageStore';
import { useNoteAIStore, convertAIResponseForEditor } from '../store/noteAIStore';

interface AIPanelProps {
  activeNote: Note | null;
  onClose: () => void;
  width?: number;
  // 编辑器ref，用于导入AI生成的内容
  editorRef?: React.RefObject<any>;
  // 导入内容到编辑器的回调
  onImportToEditor?: (content: string, mode: 'replace' | 'insert' | 'append') => void;
}

// AI Providers - Must match backend/src/types/index.ts
type AIProvider = 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'OLLAMA' | 'LMSTUDIO';

interface AIProviderOption {
  id: AIProvider;
  name: string;
  icon: string;
  models: string[];
  defaultModel: string;
}

interface AIAssistantOption {
  id: string;
  name: string;
  role?: string;
  description?: string;
  desc?: string;
  avatar?: string;
  icon?: string;
  model?: string;
  systemPrompt?: string;
  isSystem?: boolean;
}

interface AIAttachment {
  id: string;
  file: File;
  uploading: boolean;
  error?: string;
  base64?: string;
  mimeType?: string;
}

const AIPanel: React.FC<AIPanelProps> = ({ activeNote, onClose, width, editorRef, onImportToEditor }) => {
  const { t } = useLanguageStore();
  const { 
    selection, 
    getContentForAI, 
    getSelectionForAI,
    currentNoteType,
    pushHistory,
    aiResponseHistory,
    showResponseHistory,
    setShowResponseHistory,
    addResponseToHistory,
    removeFromHistory,
    clearResponseHistory,
    markAsImported
  } = useNoteAIStore();

  const AI_PROVIDER_ICON_MAP: Record<string, string> = {
    GEMINI: 'auto_awesome',
    ANTHROPIC: 'psychology',
    OPENAI: 'smart_toy',
    OLLAMA: 'dns',
    LMSTUDIO: 'hub',
  };

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<AIAttachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Database models state
  const [dbModels, setDbModels] = useState<any[]>([]);

  // Assistants loaded from database
  const [dbAssistants, setDbAssistants] = useState<AIAssistantOption[]>([]);

  // Assistant Dropdown State
  const [currentAssistant, setCurrentAssistant] = useState<AIAssistantOption | null>(null);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);

  // Conversation History State
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [pinnedConversationIds, setPinnedConversationIds] = useState<Set<string>>(new Set());

  // Copy state
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);

  // Last user prompt for regeneration
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [lastApiMessages, setLastApiMessages] = useState<any[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Message editing state
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');

  // Message feedback state
  const [messageFeedback, setMessageFeedback] = useState<Record<number, 'up' | 'down' | null>>({});

  // Message timestamps
  const [messageTimestamps, setMessageTimestamps] = useState<Record<number, Date>>({});

  // Message statistics
  const [messageStats, setMessageStats] = useState({
    totalMessages: 0,
    totalUserMessages: 0,
    totalAssistantMessages: 0,
    totalTokens: 0,
  });

  // Message reference and branching
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [branchingFrom, setBranchingFrom] = useState<number | null>(null);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);

  // Quick reply templates
  const [showTemplates, setShowTemplates] = useState(false);

  // Export format selection
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Conversation tags and favorites
  const [conversationTags, setConversationTags] = useState<Record<string, any[]>>({});
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedConversationForTag, setSelectedConversationForTag] = useState<string | null>(null);
  const [favoriteMessages, setFavoriteMessages] = useState<Set<string>>(new Set());

  // AI内容导入预览状态
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewMode, setPreviewMode] = useState<'replace' | 'insert' | 'append'>('append');

  // Custom prompts management
  interface CustomPrompt {
    id: string;
    name: string;
    prompt: string;
    category?: string;
    icon?: string;
    isSystem?: boolean;
  }

  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [promptCategories, setPromptCategories] = useState<string[]>(['all', 'code', 'writing', 'analysis', 'custom']);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState('all');
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);

  // Streaming preferences
  const [useStreaming, setUseStreaming] = useState(true);

  // AI上下文增强模式
  const [enhanceContext, setEnhanceContext] = useState(true);

  // Data management
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Network and retry state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);

  // Draft auto-save
  const [draftSaved, setDraftSaved] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'zh-CN';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Reset conversation when note changes
  useEffect(() => {
    if (activeNote?.id) {
      console.log('[AIPanel] Note changed, resetting conversation:', {
        newNoteId: activeNote.id,
        newNoteTitle: activeNote.title
      });
      setMessages([]);
      setCurrentConversationId(null);
      setInput('');
      setAttachments([]);
      setReplyingTo(null);
      setBranchingFrom(null);
      setLastUserPrompt(null);
      setLastApiMessages(null);
    }
  }, [activeNote?.id]);

  // Load models from database
  useEffect(() => {
    const loadDbModels = async () => {
      try {
        const response = await api.getAIModels() as any;
        if (response.success && response.data) {
          setDbModels(response.data);
          console.log('[AIPanel] Loaded models from database:', response.data);
        }
      } catch (error) {
        console.error('[AIPanel] Failed to load models:', error);
      }
    };
    loadDbModels();
  }, []);

  // Load assistants from database (API first, IndexedDB fallback)
  useEffect(() => {
    const loadAssistants = async () => {
      try {
        const response = await api.getAIAssistants() as any;
        if (response.success && response.data) {
          const allAssistants = [
            ...(response.data.system || []),
            ...(response.data.custom || [])
          ];
          setDbAssistants(allAssistants);
          await indexedDB.clearAndCacheAssistants(allAssistants);
          if (!currentAssistant && allAssistants.length > 0) {
            setCurrentAssistant(allAssistants[0]);
          }
          return;
        }
      } catch (error) {
        console.error('[AIPanel] Failed to load assistants from API:', error);
      }

      try {
        const cachedAssistants = await indexedDB.getAIAssistants();
        if (cachedAssistants && cachedAssistants.length > 0) {
          setDbAssistants(cachedAssistants);
          if (!currentAssistant && cachedAssistants.length > 0) {
            setCurrentAssistant(cachedAssistants[0]);
          }
          console.log('[AIPanel] Loaded assistants from IndexedDB:', cachedAssistants);
        }
      } catch (error) {
        console.error('[AIPanel] Failed to load assistants from IndexedDB:', error);
      }
    };
    loadAssistants();
  }, []);

  // Merge database models into providers list
  const mergedProviders = useMemo(() => {
    const providerMap = new Map<AIProvider, AIProviderOption>();

    // Add/update with database models
    dbModels.forEach((model: any) => {
      const providerId = model.provider as AIProvider;
      if (!providerMap.has(providerId)) {
        // Create new provider entry
        providerMap.set(providerId, {
          id: providerId,
          name: providerId.charAt(0) + providerId.slice(1).toLowerCase().replace('_', ' '),
          icon: AI_PROVIDER_ICON_MAP[providerId] || 'smart_toy',
          models: [model.modelId],
          defaultModel: model.modelId,
        });
      } else {
        // Add model to existing provider
        const existing = providerMap.get(providerId)!;
        if (!existing.models.includes(model.modelId)) {
          existing.models.push(model.modelId);
        }
      }
    });

    const result = Array.from(providerMap.values());
    console.log('[AIPanel] Merged providers:', result);
    return result;
  }, [dbModels]);

  // Validate selected provider and model after dbModels load
  useEffect(() => {
    if (mergedProviders.length > 0) {
      const currentProvider = mergedProviders.find(p => p.id === selectedProvider);
      console.log('[AIPanel] Current state:', {
        selectedProvider,
        selectedModel,
        currentProvider,
        hasProvider: !!currentProvider,
        providerModels: currentProvider?.models || []
      });

      // If selected provider not found, reset to first available
      if (!currentProvider) {
        console.log('[AIPanel] Selected provider not found, resetting to first available');
        const firstProvider = mergedProviders[0];
        setSelectedProvider(firstProvider.id);
        setSelectedModel(firstProvider.defaultModel);
      } else if (currentProvider.models.length > 0 && !currentProvider.models.includes(selectedModel)) {
        // If selected model not in provider's models, reset to provider's default
        console.log('[AIPanel] Selected model not found in provider, resetting to default');
        const validModel = currentProvider.models[0];
        setSelectedModel(validModel);
      }
    }
  }, [mergedProviders, selectedProvider, selectedModel]);

  useEffect(() => {
    if (!currentAssistant?.model || mergedProviders.length === 0) return;
    const providerWithModel = mergedProviders.find(p => p.models.includes(currentAssistant.model!));
    if (!providerWithModel) return;
    setSelectedProvider(providerWithModel.id);
    setSelectedModel(currentAssistant.model);
  }, [currentAssistant?.model, mergedProviders]);

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopSignalRef = useRef(false);
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  // Common utility function for typing effect
  const typeOutResponse = useCallback(async (text: string, onProgress: (displayText: string, isComplete: boolean) => void) => {
    let displayedText = '';
    const chars = text.split('');
    const delay = chars.length > 100 ? 5 : 20; // Faster for long responses

    for (let i = 0; i < chars.length; i++) {
      if (stopSignalRef.current) {
        onProgress(displayedText, true); // Mark as complete but stopped
        return false; // Indicate stopped
      }

      displayedText += chars[i];
      onProgress(displayedText, false);

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    onProgress(displayedText, true); // Mark as complete
    return true; // Indicate completed successfully
  }, []);

  // Common function to format AI response with mock warning
  const formatResponse = useCallback((content: string, usingMockProvider: boolean) => {
    if (usingMockProvider) {
      return '🤖 **Mock Mode Active**\n\nThe AI provider is not configured. Using mock responses for testing.\n\n---\n\n' + content;
    }
    return content;
  }, []);

  // Common function to format error messages
  const formatErrorMessage = useCallback((error: any) => {
    const errorMsg = error?.message || error?.toString() || '';
    const statusCode = error?.statusCode || error?.status;

    // Network errors
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      return '⚠️ **Network Error**\n\nUnable to connect to the server. Please check your internet connection and try again.';
    }

    // Authentication errors
    if (errorMsg.includes('401') || errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('JWT')) {
      return '⚠️ **Authentication Error**\n\nYour session has expired or your credentials are invalid. Please log in again.';
    }

    // API key errors
    if (errorMsg.includes('API') || errorMsg.includes('key') || errorMsg.includes('provider')) {
      return '⚠️ **AI Provider Not Configured**\n\nIt looks like the AI provider is not properly configured. Please:\n\n1. Go to Settings → AI Settings\n2. Configure your API keys for the selected provider\n3. Or use a local provider like Ollama or LM Studio\n\n**Tip:** You can also use the mock mode for testing.';
    }

    // Rate limit errors
    if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many requests')) {
      return '⚠️ **Rate Limit Exceeded**\n\nYou\'ve reached the rate limit for this provider. Please wait a moment and try again.\n\n**Suggestion:** Consider upgrading your API plan or switching to a different provider.';
    }

    // Timeout errors
    if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      return '⚠️ **Request Timeout**\n\nThe request took too long to complete. This might be due to:\n\n- Slow internet connection\n- High server load\n- Large response size\n\nPlease try again.';
    }

    // Server errors
    if (statusCode >= 500 || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
      return '⚠️ **Server Error**\n\nThe server is experiencing issues. Please try again later.\n\nIf this problem persists, please contact support.';
    }

    // Generic error
    return `⚠️ **Error**\n\n${errorMsg || 'An unexpected error occurred. Please try again.'}`;
  }, []);

  // Quick reply templates
  const QUICK_REPLIES = [
    { text: '请详细说明', label: '请求详细说明' },
    { text: '给我示例', label: '请求示例' },
    { text: '继续', label: '继续生成' },
    { text: '用简单的话解释', label: '简化说明' },
    { text: '总结关键点', label: '总结要点' },
  ];

  // 计算笔记内容统计信息
  const noteStats = useMemo(() => {
    if (!activeNote?.content) return null;
    
    const content = activeNote.content;
    const charCount = content.length;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const lineCount = content.split('\n').length;
    
    // 根据笔记类型计算特定统计
    let typeSpecific: { label: string; value: string | number }[] = [];
    
    switch (activeNote.type) {
      case 'Markdown':
        // 计算标题数、代码块数
        const headings = (content.match(/^#{1,6}\s/gm) || []).length;
        const codeBlocks = (content.match(/```/g) || []).length / 2;
        const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
        typeSpecific = [
          { label: '标题', value: headings },
          { label: '代码块', value: Math.floor(codeBlocks) },
          { label: '链接', value: links },
        ];
        break;
      case 'Mind Map':
        try {
          const data = JSON.parse(content);
          // 计算节点数（递归计算）
          const countNodes = (node: any): number => {
            let count = 1;
            if (node.children) {
              for (const child of node.children) {
                count += countNodes(child);
              }
            }
            return count;
          };
          const nodeCount = data.data ? countNodes(data.data) : 0;
          const maxDepth = (node: any, depth = 1): number => {
            if (!node.children || node.children.length === 0) return depth;
            return Math.max(...node.children.map((c: any) => maxDepth(c, depth + 1)));
          };
          const depth = data.data ? maxDepth(data.data) : 0;
          typeSpecific = [
            { label: '节点数', value: nodeCount },
            { label: '最大深度', value: depth },
          ];
        } catch {
          typeSpecific = [{ label: '格式', value: 'JSON' }];
        }
        break;
      case 'Drawio':
        const cellCount = (content.match(/<mxCell/g) || []).length;
        const connections = (content.match(/edge="1"/g) || []).length;
        typeSpecific = [
          { label: '元素', value: cellCount },
          { label: '连接', value: connections },
        ];
        break;
      default:
        break;
    }
    
    return {
      charCount,
      wordCount,
      lineCount,
      typeSpecific,
    };
  }, [activeNote?.content, activeNote?.type]);

  // 发送笔记内容给AI
  const handleSendNoteContent = useCallback(() => {
    if (!activeNote?.content) return;
    
    const { content, format, noteType } = getContentForAI();
    let prompt = '';
    
    // 构建上下文信息
    let contextInfo = '';
    if (enhanceContext && activeNote) {
      const noteTitle = activeNote.title || '无标题';
      const charCount = activeNote.content.length;
      const typeLabel = noteType === 'Markdown' ? 'Markdown笔记' :
                       noteType === 'Rich Text' ? '富文本笔记' :
                       noteType === 'Mind Map' ? '思维导图' : '流程图';
      
      contextInfo = `【笔记信息】\n- 标题: ${noteTitle}\n- 类型: ${typeLabel}\n- 字符数: ${charCount}\n\n`;
    }
    
    switch (noteType) {
      case 'Markdown':
        prompt = `${contextInfo}请帮我分析和优化以下Markdown笔记内容：\n\n${content}`;
        break;
      case 'Rich Text':
        prompt = `${contextInfo}请帮我分析以下富文本笔记内容：\n\n${content}`;
        break;
      case 'Mind Map':
        prompt = `${contextInfo}以下是一个思维导图的JSON数据结构，请帮我分析并提供建议：\n\n\`\`\`json\n${content}\n\`\`\``;
        break;
      case 'Drawio':
        prompt = `${contextInfo}以下是一个Draw.io流程图的XML数据，请帮我理解这个图表的结构：\n\n\`\`\`xml\n${content}\n\`\`\``;
        break;
      default:
        prompt = `${contextInfo}请帮我分析以下内容：\n\n${content}`;
    }
    
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeNote, getContentForAI, enhanceContext]);

  // 发送选中内容给AI
  const handleSendSelection = useCallback(() => {
    console.log('[AIPanel] handleSendSelection called, current selection:', selection);
    const selectionData = getSelectionForAI();
    console.log('[AIPanel] getSelectionForAI returned:', selectionData);
    if (!selectionData) {
      alert('请先在编辑器中选择一些内容');
      return;
    }

    // 构建上下文信息
    let contextInfo = '';
    if (enhanceContext && activeNote) {
      const noteTitle = activeNote.title || '无标题';
      const typeLabel = currentNoteType === 'Markdown' ? 'Markdown笔记' :
                       currentNoteType === 'Rich Text' ? '富文本笔记' :
                       currentNoteType === 'Mind Map' ? '思维导图' : '流程图';

      contextInfo = `【上下文】来自"${noteTitle}"(${typeLabel})中的选中内容\n\n`;
    }

    const prompt = `${contextInfo}请帮我处理以下选中的内容：\n\n${selectionData.content}`;
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [getSelectionForAI, enhanceContext, activeNote, currentNoteType, selection]);

  // 打开导入预览弹窗
  const handleImportToEditorClick = useCallback((content: string, mode: 'replace' | 'insert' | 'append' = 'append') => {
    // 根据笔记类型转换内容
    const convertedContent = currentNoteType 
      ? convertAIResponseForEditor(content, currentNoteType)
      : content;
    
    setPreviewContent(convertedContent);
    setPreviewMode(mode);
    setShowImportPreview(true);
  }, [currentNoteType]);

  // 确认导入内容
  const handleConfirmImport = useCallback(() => {
    if (!onImportToEditor) {
      console.warn('onImportToEditor callback not provided');
      return;
    }
    
    onImportToEditor(previewContent, previewMode);
    setShowImportPreview(false);
    setPreviewContent('');
  }, [onImportToEditor, previewContent, previewMode]);

  // Handle reply to message
  const handleReplyTo = useCallback((messageIndex: number) => {
    setReplyingTo(messageIndex);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle branching from message
  const handleBranchFrom = useCallback(async (messageIndex: number) => {
    setBranchingFrom(messageIndex);
    // Keep messages up to and including the selected message
    const messagesToKeep = messages.slice(0, messageIndex + 1);
    setMessages(messagesToKeep);

    // Clear conversation ID to create a new branch
    setCurrentConversationId(null);

    // If the selected message is from the user, prepare it for editing
    if (messages[messageIndex].role === 'user') {
      setInput(messages[messageIndex].text);
      setEditingMessageIndex(messageIndex);
      setEditedMessageText(messages[messageIndex].text);
    }
  }, [messages]);

  // Handle message search
  const handleMessageSearch = useCallback((query: string) => {
    setMessageSearchQuery(query);
    if (!query.trim()) {
      setHighlightedMessageIndex(null);
      return;
    }

    // Find first matching message
    const matchIndex = messages.findIndex(msg =>
      msg.text.toLowerCase().includes(query.toLowerCase())
    );
    if (matchIndex !== -1) {
      setHighlightedMessageIndex(matchIndex);
      // Scroll to message
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${matchIndex}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [messages]);

  // Navigate search results
  const handleNavigateSearch = useCallback((direction: 'next' | 'prev') => {
    if (!messageSearchQuery.trim()) return;

    const currentIndex = highlightedMessageIndex ?? -1;
    const searchQuery = messageSearchQuery.toLowerCase();

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = messages.findIndex((msg, idx) =>
        idx > currentIndex && msg.text.toLowerCase().includes(searchQuery)
      );
      if (nextIndex === -1) {
        // Wrap to beginning
        nextIndex = messages.findIndex(msg => msg.text.toLowerCase().includes(searchQuery));
      }
    } else {
      const prevMatches = messages.map((msg, idx) =>
        idx < currentIndex && msg.text.toLowerCase().includes(searchQuery) ? idx : -1
      ).filter(idx => idx !== -1);
      nextIndex = prevMatches.length > 0 ? prevMatches[prevMatches.length - 1] : -1;
    }

    if (nextIndex !== -1) {
      setHighlightedMessageIndex(nextIndex);
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${nextIndex}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [messageSearchQuery, highlightedMessageIndex, messages]);

  // Insert quick reply
  const insertQuickReply = useCallback((text: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + text);
    setShowTemplates(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Toggle message favorite
  const toggleFavorite = useCallback(async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message || !message.id) return;

    const messageId = message.id;
    const isFavorited = favoriteMessages.has(messageId);

    try {
      if (isFavorited) {
        await api.removeFromFavorites(messageId);
        await indexedDB.removeAIFavorite(messageId);
        setFavoriteMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } else {
        if (!currentConversationId) return;
        const response = await api.addToFavorites(messageId, currentConversationId);
        if (response.success) {
          await indexedDB.cacheAIFavorite(response.data);
          setFavoriteMessages(prev => {
            const newSet = new Set(prev);
            newSet.add(messageId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [messages, favoriteMessages, currentConversationId]);

  // Add tag to conversation
  const addTagToConversation = useCallback(async (conversationId: string, tag: string) => {
    try {
      const response = await api.addConversationTag(conversationId, tag);
      if (response.success) {
        const tagsResponse = await api.getConversationTags(conversationId);
        if (tagsResponse.success) {
          setConversationTags(prev => ({
            ...prev,
            [conversationId]: tagsResponse.data
          }));
        }
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  }, []);

  // Remove tag from conversation
  const removeTagFromConversation = useCallback(async (conversationId: string, tagId: string) => {
    try {
      await api.removeConversationTag(tagId);
      const tagsResponse = await api.getConversationTags(conversationId);
      if (tagsResponse.success) {
        setConversationTags(prev => ({
          ...prev,
          [conversationId]: tagsResponse.data
        }));
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  }, []);

  // Add custom prompt
  const addCustomPrompt = useCallback(async (name: string, prompt: string, category?: string) => {
    try {
      const response = await api.createCustomPrompt({
        name,
        prompt,
        category: category || 'custom'
      });
      if (response.success) {
        setCustomPrompts(prev => [...prev, response.data]);
        await indexedDB.cacheAIPrompt(response.data);
      }
    } catch (error) {
      console.error('Failed to create custom prompt:', error);
    }
  }, []);

  // Update custom prompt
  const updateCustomPrompt = useCallback(async (id: string, name: string, prompt: string, category?: string) => {
    try {
      const response = await api.updateCustomPrompt(id, {
        name,
        prompt,
        category: category
      });
      if (response.success) {
        setCustomPrompts(prev => prev.map(p =>
          p.id === id ? response.data : p
        ));
        await indexedDB.cacheAIPrompt(response.data);
        setEditingPrompt(null);
      }
    } catch (error) {
      console.error('Failed to update custom prompt:', error);
    }
  }, []);

  // Delete custom prompt
  const deleteCustomPrompt = useCallback(async (id: string) => {
    // Don't allow deleting system prompts
    const prompt = customPrompts.find(p => p.id === id);
    if (prompt?.isSystem) {
      alert('系统提示词不能删除');
      return;
    }
    
    try {
      await api.deleteCustomPrompt(id);
      await indexedDB.removeAIPrompt(id);
      setCustomPrompts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete custom prompt:', error);
    }
  }, [customPrompts]);

  // Filter prompts by category
  const getFilteredPrompts = useCallback(() => {
    if (selectedPromptCategory === 'all') {
      return customPrompts;
    }
    return customPrompts.filter(p => p.category === selectedPromptCategory);
  }, [customPrompts, selectedPromptCategory]);

  // Get category display name
  const getCategoryName = useCallback((category: string) => {
    const names: Record<string, string> = {
      all: '全部',
      code: '代码',
      writing: '写作',
      analysis: '分析',
      custom: '自定义',
    };
    return names[category] || category;
  }, []);

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    if (confirm('确定要清除所有收藏的消息吗？')) {
      setFavoriteMessages(new Set());
    }
  }, []);

  // Clear all custom data
  const clearAllData = useCallback(async () => {
    if (confirm('确定要清除所有本地数据吗？这将删除：\n• 收藏的消息\n• 对话标签\n• 自定义提示词\n• 草稿')) {
      setFavoriteMessages(new Set());
      setConversationTags({});
      setCustomPrompts([]);
      
      await indexedDB.clear(STORES.AI_FAVORITES);
      await indexedDB.clear(STORES.AI_PROMPTS);
      await indexedDB.clear(STORES.AI_DRAFTS);
      
      localStorage.removeItem('favorite-messages');
      localStorage.removeItem('conversation-tags');
      localStorage.removeItem('custom-prompts');
      localStorage.removeItem('ai-panel-draft');
      
      alert('所有数据已清除');
    }
  }, []);

  // Export all data
  const exportAllData = useCallback(() => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      favoriteMessages: [...favoriteMessages],
      conversationTags,
      customPrompts
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-panel-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [favoriteMessages, conversationTags, customPrompts]);

  // Update available models when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    const provider = mergedProviders.find(p => p.id === selectedProvider);
    if (!provider) return;
    if (!selectedModel || !provider.models.includes(selectedModel)) {
      setSelectedModel(provider.defaultModel);
    }
  }, [selectedProvider, mergedProviders, selectedModel]);

  // Load conversation history
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const performInitialSetup = async () => {
      try {
        const [promptsRes, favoritesRes, settingsRes] = await Promise.all([
          api.getCustomPrompts() as any,
          api.getFavoriteMessages() as any,
          api.getAISettings() as any
        ]);

        if (promptsRes.success) {
          setCustomPrompts(promptsRes.data);
          await indexedDB.cacheAIPrompts(promptsRes.data);
        }
        if (favoritesRes.success) {
          const favoriteIds = new Set<string>(favoritesRes.data.map((f: any) => f.messageId));
          setFavoriteMessages(favoriteIds);
          await indexedDB.cacheAIFavorites(favoritesRes.data);
        }
        if (settingsRes.success && settingsRes.data) {
          if (settingsRes.data.defaultProvider) {
            setSelectedProvider(settingsRes.data.defaultProvider as AIProvider);
          }
          if (settingsRes.data.defaultModel) {
            setSelectedModel(settingsRes.data.defaultModel);
          }
          await indexedDB.cacheAISettings(settingsRes.data);
        }
      } catch (error) {
        console.error('Initial setup failed:', error);
      }
    };

    performInitialSetup();
  }, []);

  useEffect(() => {}, [conversationTags]);
  useEffect(() => {}, [favoriteMessages]);
  useEffect(() => {}, [customPrompts]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setDraftSaved(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await indexedDB.cacheAIDraft({ id: 'ai-panel-draft', text: input });
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const dbDraft = await indexedDB.getAIDraft('ai-panel-draft');
        if (dbDraft && dbDraft.text && !input) {
          setInput(dbDraft.text);
          console.log('[AIPanel] Loaded draft from IndexedDB');
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };
    loadDraft();
  }, []);

  const loadConversations = async (autoLoad = false) => {
    try {
      const response = await api.getAIConversations() as any;
      if (response.success && Array.isArray(response.data)) {
        setConversations(response.data);
        // Only auto-load if explicitly requested
        if (autoLoad && response.data.length > 0) {
          const latestConversation = response.data[0];
          setCurrentConversationId(latestConversation.id);
          // Load messages from the conversation
          await loadConversationMessages(latestConversation.id);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await api.getAIConversation(conversationId) as any;
      if (response.success && response.data?.messages) {
        // Convert stored messages to chat format
        const chatMessages: ChatMessage[] = response.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'model' : msg.role,
          text: msg.content,
          type: 'text'
        }));
        setMessages(chatMessages);

        // Load tags for this conversation
        const tagsResponse = await api.getConversationTags(conversationId);
        if (tagsResponse.success) {
          setConversationTags(prev => ({
            ...prev,
            [conversationId]: tagsResponse.data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAssistantMenu(false);
      }
      if (providerMenuRef.current && !providerMenuRef.current.contains(event.target as Node)) {
        setShowProviderMenu(false);
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Update message statistics
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'model');

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const totalCharacters = messages.reduce((sum, m) => sum + m.text.length, 0);
    const estimatedTokens = Math.ceil(totalCharacters / 4);

    setMessageStats({
      totalMessages: messages.length,
      totalUserMessages: userMessages.length,
      totalAssistantMessages: assistantMessages.length,
      totalTokens: estimatedTokens,
    });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' ||
          (e.target as HTMLElement).tagName === 'INPUT') {
      // Check for Ctrl/Cmd + Enter in textarea
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' && input.trim()) {
          e.preventDefault();
          handleSend();
        }
      }
      return;
    }

      // Global shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        handleNewChat();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExportConversation('markdown');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'r' && lastUserPrompt) {
        e.preventDefault();
        handleRegenerate();
      } else if (e.key === 'Escape' && (loading || regenerating)) {
        e.preventDefault();
        handleStop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [input, loading, regenerating, lastUserPrompt]);

  // Adjust textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!selectedProvider || !selectedModel) {
      alert('请先选择可用模型');
      return;
    }

    console.log('[AIPanel] handleSend called:', {
      inputLength: input.length,
      inputPreview: input.substring(0, 50),
      currentMessagesCount: messages.length,
      loading
    });

    const userPrompt = input;
    const userMsg: ChatMessage = { role: 'user', text: userPrompt };
    const aiPlaceholderMsg: ChatMessage = { role: 'model', text: '' };

    // Build the updated messages list immediately (before state updates)
    const updatedMessages = [...messages, userMsg, aiPlaceholderMsg];

    // Optimistic UI updates
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Set timestamp for the new user message
    setMessageTimestamps(prev => ({
      ...prev,
      [updatedMessages.length - 2]: new Date(),
    }));

    setLoading(true);
    setIsStreaming(true);
    stopSignalRef.current = false;

    try {
      // Build messages for API - convert to API format
      // Use updatedMessages without the AI placeholder at the end
      let messagesForApi = updatedMessages.slice(0, -1);

      // Truncate history to keep context window manageable (Last 10 messages)
      const MAX_HISTORY = 10;
      if (messagesForApi.length > MAX_HISTORY) {
        messagesForApi = messagesForApi.slice(-MAX_HISTORY);
      }

      const apiMessages = messagesForApi.map(m => ({
        role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
        content: m.text
      }));

      // Add system message with assistant context
      if (currentAssistant?.systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: currentAssistant.systemPrompt
        });
      } else if (currentAssistant?.name) {
        const roleText = currentAssistant.role ? ` specializing in ${currentAssistant.role.toLowerCase()}` : '';
        const descText = currentAssistant.description || currentAssistant.desc || '';
        apiMessages.unshift({
          role: 'system',
          content: `You are ${currentAssistant.name}, an AI assistant${roleText}. ${descText}`.trim()
        });
      }

      // Add note context if available
      if (activeNote?.content) {
        apiMessages.splice(1, 0, {
          role: 'system',
          content: `Current note context:\nTitle: ${activeNote.title}\nContent: ${activeNote.content}`
        });
      }

      // Add attachment context if any
      if (attachments.length > 0) {
        const attachmentInfo = attachments.map(f => `- ${f.file.name} (${(f.file.size / 1024).toFixed(1)} KB)`).join('\n');
        const attachmentIds = attachments.map(f => f.id);
        apiMessages.splice(1, 0, {
          role: 'system',
          content: `User has attached the following files:\n${attachmentInfo}\n\nAttachment IDs: ${attachmentIds.join(', ')}`
        });

        const imageAttachments = attachments.filter(a => a.base64 && a.file.type.startsWith('image/'));
        if (imageAttachments.length > 0) {
          const imagePayload = imageAttachments.map((a, idx) => (
            `Image ${idx + 1}: ${a.file.name}\nMIME: ${a.mimeType || a.file.type}\nBase64: ${a.base64}`
          )).join('\n\n');
          apiMessages.splice(1, 0, {
            role: 'system',
            content: `User provided image data in base64:\n${imagePayload}`
          });
        }
      }

      // Call API with real provider and model - with retry logic
      let response;
      let lastError;
      let currentRetry = 0;

      // Use streaming if enabled
      if (useStreaming) {
        // Streaming mode - use SSE
        let accumulatedText = '';
        let finalConversationId: string | undefined;

        const controller = new AbortController();
        streamAbortControllerRef.current = controller;

        await api.chatAIStream(
          {
            provider: selectedProvider as any,
            messages: apiMessages,
            conversationId: currentConversationId || undefined,
            attachmentIds: attachments.map(a => a.id),
            options: { model: selectedModel }
          },
          // onChunk callback
          (chunk, done, conversationId) => {
            console.log('[AIPanel onChunk] Received chunk:', { chunk: chunk.substring(0, 30), done, conversationId, accumulatedLength: accumulatedText.length });
            accumulatedText += chunk;
            finalConversationId = conversationId;
            console.log('[AIPanel onChunk] After append, accumulated length:', accumulatedText.length);

            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsgIndex = newMessages.length - 1;
              console.log('[AIPanel onChunk] Updating message at index', lastMsgIndex, 'with text length:', accumulatedText.length);
              newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: accumulatedText };
              return newMessages;
            });
          },
          // onComplete callback
          async (conversationId) => {
            console.log('[AIPanel] Stream completed with conversationId:', conversationId);
            
            // Set final timestamp for response message
            setMessageTimestamps(prev => {
              const newMessagesCount = updatedMessages.length;
              return {
                ...prev,
                [newMessagesCount - 1]: new Date(),
              };
            });
            
            // Only reload if we don't have a local conversation ID
            // to avoid overwriting the streamed content
            if (conversationId && !currentConversationId) {
              console.log('[AIPanel] First conversation created, setting ID:', conversationId);
              setCurrentConversationId(conversationId);
              // Don't reload messages - they're already in the UI
            }
          },
          // onError callback
          (error) => {
            console.error('Stream error:', error);
            const errorMessage = formatErrorMessage(error);
            setMessages(prev => [...prev, {
              role: 'model',
              text: errorMessage,
              type: 'text'
            }]);
          },
          controller
        );

        // Wait for stream to complete
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (controller.signal.aborted) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);

          // Also set a timeout to avoid hanging
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 120000); // 2 minute timeout
        });

        // Store context for regeneration
        setLastUserPrompt(userPrompt);
        setLastApiMessages(apiMessages);

        // Only reload conversations if needed
        await loadConversations();
        
        // Cache conversation to IndexedDB if created
        if (finalConversationId) {
          try {
            const convRes = await api.getAIConversation(finalConversationId) as any;
            if (convRes.success) {
              await indexedDB.cacheConversation(convRes.data);
            }
          } catch (error) {
            console.warn('Failed to cache conversation:', error);
          }
        }

      setAttachments([]);
      } else {
        // Non-streaming mode - use regular API with retry logic
        while (currentRetry <= maxRetries) {
          try {
            response = await api.chatAI({
              provider: selectedProvider as any,
              model: selectedModel,
              messages: apiMessages,
              conversationId: currentConversationId || undefined,
              attachmentIds: attachments.map(a => a.id)
            }) as any;

            // Success - break out of retry loop
            if (response.success || response?.data) {
              break;
            }
          } catch (error: any) {
            lastError = error;
            currentRetry++;

            // Check if error is retryable
            const errorMsg = error?.message || '';
            const isRetryable = errorMsg.includes('timeout') ||
                              errorMsg.includes('ETIMEDOUT') ||
                              errorMsg.includes('ECONNRESET') ||
                              error?.statusCode >= 500;

            if (!isRetryable || currentRetry > maxRetries) {
              throw error;
            }

            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, currentRetry - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Show retry indicator
            if (currentRetry > 0) {
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    text: `正在重试... (${currentRetry}/${maxRetries})`
                  };
                }
                return newMessages;
              });
            }
          }
        }

        if (response?.success && response?.data) {
          // Store context for regeneration
          setLastUserPrompt(userPrompt);
          setLastApiMessages(apiMessages);

          // Format and type out the response
          const fullText = formatResponse(response.data.content || '', response.data.usingMockProvider);
          let lastMsgIndex = 0;

          await typeOutResponse(fullText, (displayText, isComplete) => {
            setMessages(prev => {
              const newMessages = [...prev];
              lastMsgIndex = newMessages.length - 1;
              newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: displayText };
              return newMessages;
            });

            // Set timestamp when complete
            if (isComplete) {
              setMessageTimestamps(prev => ({
                ...prev,
                [lastMsgIndex]: new Date(),
              }));
            }
          });

          // 保存AI响应到历史记录
          if (fullText && fullText.trim()) {
            addResponseToHistory(fullText);
          }

          // Update or create conversation
          if (!currentConversationId) {
            // The API should have created a new conversation
          if (response.data.conversationId) {
            setCurrentConversationId(response.data.conversationId);
            await loadConversations();
            await loadConversationMessages(response.data.conversationId);
            
            const convRes = await api.getAIConversation(response.data.conversationId) as any;
            if (convRes.success) {
              await indexedDB.cacheConversation(convRes.data);
            }
          }
        } else {
          await loadConversations();
          await loadConversationMessages(currentConversationId);
          
          const convRes = await api.getAIConversation(currentConversationId) as any;
          if (convRes.success) {
            await indexedDB.cacheConversation(convRes.data);
          }
        }

        setAttachments([]);
        } else {
          throw new Error('Failed to get AI response');
        }
      }
    } catch (error: any) {
      console.error("AI Error:", error);

      const errorMessage = formatErrorMessage(error);

      // Remove the empty placeholder message
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));

      // Add error message
      setMessages(prev => [...prev, {
        role: 'model',
        text: errorMessage,
        type: 'text'
      }]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      stopSignalRef.current = false;
      streamAbortControllerRef.current = null;
    }
  };

  const handleRegenerate = async () => {
    if (!lastUserPrompt || !lastApiMessages || loading || regenerating) return;
    if (!selectedProvider || !selectedModel) {
      alert('请先选择可用模型');
      return;
    }

    setRegenerating(true);
    stopSignalRef.current = false;

    // Remove the last assistant message and replace with new placeholder
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
        newMessages[newMessages.length - 1] = { role: 'model', text: '' };
      }
      return newMessages;
    });

    try {
      // Use streaming if enabled
      if (useStreaming) {
        let accumulatedText = '';

        const controller = await api.chatAIStream(
          {
            provider: selectedProvider as any,
            model: selectedModel,
            messages: lastApiMessages,
            conversationId: currentConversationId || undefined,
            attachmentIds: attachments.map(a => a.id)
          },
          (chunk) => {
            accumulatedText += chunk;
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsgIndex = newMessages.length - 1;
              newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: accumulatedText };
              return newMessages;
            });
          },
          () => {
            setMessageTimestamps(prev => {
              const newMessages = messages.length + 1;
              return {
                ...prev,
                [newMessages - 1]: new Date(),
              };
            });
          },
          (error) => {
            console.error('Regenerate stream error:', error);
            const errorMessage = formatErrorMessage(error);
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0) {
                newMessages[newMessages.length - 1] = { role: 'model', text: errorMessage, type: 'text' };
              }
              return newMessages;
            });
          }
        );

        streamAbortControllerRef.current = controller;

        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (controller.signal.aborted) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 120000);
        });

        await loadConversations();
      } else {
        // Non-streaming mode
        const response = await api.chatAI({
          provider: selectedProvider as any,
          model: selectedModel,
          messages: lastApiMessages,
          conversationId: currentConversationId || undefined,
          attachmentIds: attachments.map(a => a.id)
        }) as any;

        if (response.success && response.data) {
          // Format and type out the response
          const fullText = formatResponse(response.data.content || '', response.data.usingMockProvider);

          await typeOutResponse(fullText, (displayText) => {
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsgIndex = newMessages.length - 1;
              newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: displayText };
              return newMessages;
            });
          });

          // 保存AI响应到历史记录
          if (fullText && fullText.trim()) {
            addResponseToHistory(fullText);
          }

          await loadConversations();
        }
      }
    } catch (error: any) {
      console.error("Regenerate Error:", error);
      const errorMessage = "Sorry, I failed to regenerate the response. Please try again.";
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = { role: 'model', text: errorMessage, type: 'text' };
        }
        return newMessages;
      });
    } finally {
      setRegenerating(false);
      streamAbortControllerRef.current = null;
    }
  };

  const handleStartEdit = (messageIndex: number) => {
    setEditingMessageIndex(messageIndex);
    setEditedMessageText(messages[messageIndex].text);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditedMessageText('');
  };

  const handleSaveEdit = async (messageIndex: number) => {
    if (!editedMessageText.trim()) return;

    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], text: editedMessageText };
    setMessages(updatedMessages);
    handleCancelEdit();

    // If editing a user message, also trigger a regeneration of the response
    if (updatedMessages[messageIndex].role === 'user' && messageIndex < updatedMessages.length - 1) {
      // Remove all messages after this one
      const messagesToKeep = updatedMessages.slice(0, messageIndex + 1);
      setMessages(messagesToKeep);

      // Resend with the edited message
      setInput(editedMessageText);
      // Small delay to ensure state updates
      setTimeout(() => handleSend(), 100);
    }
  };

  const handleFeedback = (messageIndex: number, feedback: 'up' | 'down') => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageIndex]: prev[messageIndex] === feedback ? null : feedback,
    }));

    // Log feedback for analytics/quality tracking
    console.log(`Message ${messageIndex} feedback: ${feedback}`);
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setIsStreaming(false);
    setLoading(false);
    // Abort streaming if active
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
    }
  };

  const readImageAsDataUrl = (file: File, maxSize = 1024, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const mimeType = ['image/jpeg', 'image/webp'].includes(file.type) ? file.type : 'image/png';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  // Handle file attachments
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });

      // Create attachment objects with uploading status
      const newAttachments: AIAttachment[] = newFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        uploading: true,
      }));

      setAttachments(prev => [...prev, ...newAttachments]);

      // Convert image files to base64 for model input
      for (const attachment of newAttachments) {
        if (attachment.file.type.startsWith('image/')) {
          try {
            const dataUrl = await readImageAsDataUrl(attachment.file);
            setAttachments(prev => prev.map(a =>
              a.id === attachment.id
                ? { ...a, base64: dataUrl, mimeType: attachment.file.type }
                : a
            ));
          } catch (error) {
            console.error('Failed to read image as base64:', error);
          }
        }
      }

      // Upload each file
      for (const attachment of newAttachments) {
        try {
          const response = await api.uploadAIAttachment(attachment.file) as any;
          if (response.success && response.data) {
            // Update attachment with server ID
            setAttachments(prev => prev.map(a =>
              a.id === attachment.id
                ? { ...a, id: response.data.id, uploading: false }
                : a
            ));
          }
        } catch (error) {
          console.error('Upload failed:', error);
          setAttachments(prev => prev.map(a =>
            a.id === attachment.id
              ? { ...a, uploading: false, error: 'Upload failed' }
              : a
          ));
        }
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['pdf'].includes(ext || '')) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'description';
    if (['xls', 'xlsx'].includes(ext || '')) return 'table_chart';
    if (['zip', 'rar'].includes(ext || '')) return 'folder_zip';
    return 'attach_file';
  };

  const handleAssistantSelect = useCallback(async (assistant: AIAssistantOption) => {
    setCurrentAssistant(assistant);
    setShowAssistantMenu(false);

    if (assistant.model) {
      const providerWithModel = mergedProviders.find(p => p.models.includes(assistant.model!));
      
      if (providerWithModel) {
        setSelectedProvider(providerWithModel.id);
        setSelectedModel(assistant.model);
        try {
          await api.updateAISettings({
            defaultProvider: providerWithModel.id,
            defaultModel: assistant.model
          });
        } catch (error) {
          console.error('Failed to sync assistant model config:', error);
        }
      }
    }
    setMessages(prev => [...prev,
      { role: 'model',
        text: `Switched to **${assistant.name}**. I'm ready to help with ${(assistant.role || 'general').toLowerCase()} tasks.`,
        type: 'text'
      }
    ]);
  }, [mergedProviders]);

  useEffect(() => {
    const savedAssistantId = localStorage.getItem('template_default_assistant');
    if (savedAssistantId) {
      setPendingAssistantId(savedAssistantId);
      localStorage.removeItem('template_default_assistant');
    }
  }, []);

  // Listen for template-driven assistant switch
  useEffect(() => {
    const handleSwitch = (event: Event) => {
      const detail = (event as CustomEvent).detail as { assistantId?: string } | undefined;
      const assistantId = detail?.assistantId;
      if (!assistantId) return;

      const match = dbAssistants.find(ast => ast.id === assistantId);
      if (match) {
        handleAssistantSelect(match);
        setPendingAssistantId(null);
      } else {
        setPendingAssistantId(assistantId);
      }
    };

    window.addEventListener('ai-assistant-switch', handleSwitch as EventListener);
    return () => window.removeEventListener('ai-assistant-switch', handleSwitch as EventListener);
  }, [dbAssistants, handleAssistantSelect]);

  useEffect(() => {
    if (!pendingAssistantId) return;
    const match = dbAssistants.find(ast => ast.id === pendingAssistantId);
    if (match) {
      handleAssistantSelect(match);
      setPendingAssistantId(null);
    }
  }, [dbAssistants, pendingAssistantId, handleAssistantSelect]);

  const handleProviderSelect = async (providerId: AIProvider) => {
    setSelectedProvider(providerId);
    setShowProviderMenu(false);
    setShowModelMenu(false);
    
    // Persist locally for offline-first
    try {
      const currentSettings = await indexedDB.getAISettings() || { id: 'current' };
      await indexedDB.cacheAISettings({ ...currentSettings, defaultProvider: providerId });
    } catch (err) {
      console.warn('Failed to cache provider setting locally:', err);
    }

    try {
      await api.updateAISettings({ defaultProvider: providerId });
    } catch (error) {
      console.error('Failed to sync provider setting:', error);
      // If offline, it will be synced later if we add it to the queue
      // For now, local persistence is handled above
    }
  };

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    setShowModelMenu(false);

    // Persist locally for offline-first
    try {
      const currentSettings = await indexedDB.getAISettings() || { id: 'current' };
      await indexedDB.cacheAISettings({ ...currentSettings, defaultModel: model });
    } catch (err) {
      console.warn('Failed to cache model setting locally:', err);
    }

    try {
      await api.updateAISettings({ defaultModel: model });
    } catch (error) {
      console.error('Failed to sync model setting:', error);
    }
  };

  const handleNewChat = () => {
    const greetingName = currentAssistant?.name ? `我是${currentAssistant.name}，` : '';
    setMessages([
      { role: 'model', text: `你好！${greetingName}很高兴为你服务。有什么我可以帮助你的吗？`, type: 'text' }
    ]);
    setCurrentConversationId(null);
    setInput('');
    setAttachments([]);
    // Clear regeneration context
    setLastUserPrompt(null);
    setLastApiMessages(null);
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;

    if (confirm('Are you sure you want to clear all messages in this conversation?')) {
      setMessages([
        { role: 'model', text: "Conversation cleared. How can I help you?", type: 'text' }
      ]);
      // If there's a conversation in DB, we should probably start a new one or clear it
      setCurrentConversationId(null);
    }
  };

  const handleExportConversation = (format: 'markdown' | 'json' | 'txt' = 'markdown') => {
    if (messages.length <= 1) return;

    const timestamp = new Date().toISOString();
    const filename = `ai-conversation-${Date.now()}`;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      // Export as JSON
      const jsonData = {
        metadata: {
          date: new Date().toISOString(),
          provider: currentProviderData?.name,
          model: selectedModel,
          assistant: currentAssistant ? {
            name: currentAssistant.name,
            role: currentAssistant.role,
            description: currentAssistant.description || currentAssistant.desc
          } : null,
          messageCount: messages.length,
          totalTokens: messageStats.totalTokens
        },
        messages: messages.map((msg, index) => ({
          index,
          role: msg.role,
          content: msg.text,
          type: msg.type,
          timestamp: messageTimestamps[index]?.toISOString()
        }))
      };
      content = JSON.stringify(jsonData, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'txt') {
      // Export as plain text
      content = `AI Conversation Export\n`;
      content += `${'='.repeat(50)}\n\n`;
      content += `Date: ${new Date().toLocaleString()}\n`;
      content += `Provider: ${currentProviderData?.name} (${selectedModel})\n`;
      content += `Assistant: ${currentAssistant?.name || 'N/A'}\n\n`;
      content += `${'='.repeat(50)}\n\n`;

      messages.forEach((msg, index) => {
        const role = msg.role === 'model' ? 'ASSISTANT' : 'USER';
        content += `[${role}]\n`;
        content += `${msg.text}\n\n`;
        if (index < messages.length - 1) {
          content += `${'-'.repeat(30)}\n\n`;
        }
      });
      mimeType = 'text/plain';
      extension = 'txt';
    } else {
      // Export as Markdown (default)
      content = `# AI Conversation\n\n`;
      content += `**Date:** ${new Date().toLocaleString()}\n`;
      content += `**Provider:** ${currentProviderData?.name} • ${selectedModel}\n`;
      content += `**Assistant:** ${currentAssistant?.name || 'N/A'} (${currentAssistant?.role || 'N/A'})\n`;
      content += `**Messages:** ${messages.length}\n`;
      content += `**Tokens:** ~${messageStats.totalTokens}\n\n`;
      content += `---\n\n`;

      messages.forEach((msg, index) => {
        const role = msg.role === 'model' ? '🤖 **Assistant**' : '**User**';
        const timestamp = messageTimestamps[index]
          ? `*${new Date(messageTimestamps[index]).toLocaleTimeString()}*\n`
          : '';

        content += `## ${role}\n\n${timestamp}${msg.text}\n\n`;

        if (index < messages.length - 1) {
          content += `---\n\n`;
        }
      });
      mimeType = 'text/markdown';
      extension = 'md';
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await api.deleteAIConversation(conversationId);

        // Remove from IndexedDB cache to ensure sync consistency
        await indexedDB.removeConversation(conversationId);

        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationId));

        // If we deleted the current conversation, start a new one
        if (currentConversationId === conversationId) {
          handleNewChat();
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation');
      }
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (currentConversationId === conversationId) return;

    setCurrentConversationId(conversationId);
    await loadConversationMessages(conversationId);
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeBlock(blockId);
      setTimeout(() => setCopiedCodeBlock(null), 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
    });
  };

  // Custom code block component with copy button
  const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');
    // Use ref to keep ID stable across renders
    const blockIdRef = useRef(Math.random().toString(36).substring(7));
    const blockId = blockIdRef.current;

    if (inline) {
      return (
        <code className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-100 dark:bg-gray-800 text-red-500 dark:text-red-400 font-mono text-xs border border-gray-200 dark:border-gray-700" {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="relative group my-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-[#0d1117]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/40"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/40"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/40"></span>
            </div>
            {language && (
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{language}</span>
            )}
          </div>
          <button
            onClick={() => handleCopyCode(codeString, blockId)}
            className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Copy code"
          >
            <span className="material-symbols-outlined text-[12px]">
              {copiedCodeBlock === blockId ? 'check' : 'content_copy'}
            </span>
            <span>{copiedCodeBlock === blockId ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <pre className="!mt-0 !mb-0 p-3 text-sm">
            <code className={className || ''} {...props}>
              {children}
            </code>
          </pre>
        </div>
      </div>
    );
  };

  // 根据笔记类型生成特定的快捷操作
  const getNoteTypeSpecificActions = useMemo(() => {
    const baseActions = [
      {
        label: 'Summarize',
        icon: 'summarize',
        prompt: activeNote?.content
          ? 'Summarize the key points from this note in a concise format'
          : 'Help me create a summary for my notes'
      },
      {
        label: 'Improve Writing',
        icon: 'edit_note',
        prompt: activeNote?.content
          ? 'Review and improve the writing in this note: fix grammar, enhance clarity, and suggest better phrasing'
          : 'Help me improve my writing style'
      },
    ];

    // 根据笔记类型添加特定操作
    switch (currentNoteType) {
      case 'Markdown':
        return [
          ...baseActions,
          {
            label: '续写内容',
            icon: 'auto_fix_high',
            prompt: activeNote?.content
              ? '请基于笔记的内容和风格，续写以下内容，保持一致的写作风格：\n\n' + (selection?.text || activeNote.content.slice(-500))
              : '帮我续写这段内容'
          },
          {
            label: '生成目录',
            icon: 'toc',
            prompt: activeNote?.content
              ? '请为这篇文档生成一个Markdown格式的目录（Table of Contents）'
              : '帮我创建目录结构'
          },
          {
            label: '格式化代码',
            icon: 'code',
            prompt: activeNote?.content
              ? '请检查并格式化这篇笔记中的代码块，确保语法正确并添加适当的注释'
              : '帮我格式化代码'
          },
          {
            label: '添加注释',
            icon: 'comment',
            prompt: selection?.text
              ? '请为以下内容添加详细的解释和注释：\n\n' + selection.text
              : '帮我为选中的内容添加注释'
          },
        ];
      case 'Rich Text':
        return [
          ...baseActions,
          {
            label: '美化格式',
            icon: 'format_paint',
            prompt: activeNote?.content
              ? '请帮我优化这篇富文本文档的格式，使其更加清晰易读，添加适当的标题、列表和重点标注'
              : '帮我美化文档格式'
          },
          {
            label: '转Markdown',
            icon: 'markdown',
            prompt: activeNote?.content
              ? '请将这篇富文本内容转换为规范的Markdown格式'
              : '帮我转换为Markdown'
          },
          {
            label: '生成要点',
            icon: 'format_list_bulleted',
            prompt: activeNote?.content
              ? '请将这篇文档的主要内容整理成简洁的要点列表'
              : '帮我提取要点'
          },
        ];
      case 'Mind Map':
        return [
          {
            label: '扩展节点',
            icon: 'add_circle',
            prompt: selection?.text
              ? `请为思维导图的"${selection.text}"节点生成5-8个相关的子节点建议，以JSON数组格式返回：["子节点1", "子节点2", ...]`
              : '请帮我扩展思维导图的选中节点'
          },
          {
            label: '优化结构',
            icon: 'account_tree',
            prompt: activeNote?.content
              ? '请分析这个思维导图的JSON结构，并建议如何优化其层级和组织方式'
              : '帮我优化思维导图结构'
          },
          {
            label: '生成摘要',
            icon: 'description',
            prompt: activeNote?.content
              ? '请根据这个思维导图的内容，生成一篇结构化的文字摘要'
              : '帮我将思维导图转为文字'
          },
          {
            label: '补充分支',
            icon: 'mediation',
            prompt: activeNote?.content
              ? '请分析这个思维导图，找出可能遗漏的重要分支，并建议补充内容'
              : '帮我补充思维导图'
          },
          {
            label: '重新组织',
            icon: 'swap_horiz',
            prompt: activeNote?.content
              ? '请帮我重新组织这个思维导图的结构，使其更加逻辑清晰'
              : '帮我重组思维导图'
          },
        ];
      case 'Drawio':
        return [
          {
            label: '分析流程',
            icon: 'analytics',
            prompt: activeNote?.content
              ? '请分析这个流程图的XML结构，解读其中的流程逻辑和各节点之间的关系'
              : '帮我分析流程图'
          },
          {
            label: '优化流程',
            icon: 'auto_fix',
            prompt: activeNote?.content
              ? '请分析这个流程图，并提出优化建议：简化步骤、合并重复环节、改进流程效率'
              : '帮我优化流程设计'
          },
          {
            label: '生成说明',
            icon: 'article',
            prompt: activeNote?.content
              ? '请根据这个流程图生成详细的文字说明文档，描述每个步骤和决策点'
              : '帮我生成流程说明'
          },
          {
            label: '检查完整性',
            icon: 'fact_check',
            prompt: activeNote?.content
              ? '请检查这个流程图的完整性：是否有遗漏的分支、死循环、或缺少的条件判断'
              : '帮我检查流程图'
          },
        ];
      default:
        return [
          ...baseActions,
          {
            label: 'Generate Ideas',
            icon: 'lightbulb',
            prompt: activeNote?.content
              ? 'Based on this note, generate 5 creative ideas or next steps I should consider'
              : 'Give me some creative ideas for my project'
          },
          {
            label: 'Action Items',
            icon: 'checklist',
            prompt: activeNote?.content
              ? 'Extract all action items, tasks, and to-dos from this note and organize them by priority'
              : 'Help me create a checklist of tasks'
          },
        ];
    }
  }, [activeNote?.content, currentNoteType, selection?.text]);

  const smartActions = getNoteTypeSpecificActions;

  const handleSmartAction = (action: typeof smartActions[0]) => {
    setInput(action.prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const systemAssistants = useMemo(
    () => dbAssistants.filter(a => a.isSystem),
    [dbAssistants]
  );
  const customAssistants = useMemo(
    () => dbAssistants.filter(a => !a.isSystem),
    [dbAssistants]
  );

  const currentProviderData = mergedProviders.find(p => p.id === selectedProvider);
  const currentAssistantSubtitle = currentAssistant?.model
    ? `${currentAssistant.role || '—'} · ${currentAssistant.model}`
    : (currentAssistant?.role || '—');

  // Filter and sort conversations (pinned first)
  const filteredConversations = conversations
    .filter((conv: any) =>
      conv.title?.toLowerCase().includes(conversationSearchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const aPinned = pinnedConversationIds.has(a.id);
      const bPinned = pinnedConversationIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const handleTogglePin = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPinnedConversationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  return (
    <aside
      className="flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c1419] shrink-0 transition-none"
      style={{ width: width ? `${width}px` : '320px' }}
    >
      {/* Header with Provider & Model Selection */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#15232a]">
        {/* Assistant Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowAssistantMenu(!showAssistantMenu)}
            className="w-full flex items-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 p-1 -ml-1 rounded-lg transition-colors"
          >
             <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[12px]">{currentAssistant?.avatar || currentAssistant?.icon || 'smart_toy'}</span>
             </div>
             <div className="flex flex-col items-start flex-1">
               <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100 leading-none">{currentAssistant?.name || '请选择助手'}</span>
               <span className="text-[9px] text-gray-400 font-medium">{currentAssistantSubtitle}</span>
             </div>
             <span className={`material-symbols-outlined text-gray-400 text-[14px] transition-transform duration-200 ${showAssistantMenu ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {/* Assistant Dropdown */}
          {showAssistantMenu && (
             <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="p-2 space-y-0.5 max-h-96 overflow-y-auto">
                  {/* System Assistants */}
                  {systemAssistants.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">System Assistants</p>
                      {systemAssistants.map(ast => (
                          <button
                            key={ast.id}
                            onClick={() => handleAssistantSelect(ast)}
                            className={`w-full text-left px-2.5 py-2 flex items-center gap-2.5 rounded-lg transition-colors ${
                              currentAssistant?.id === ast.id
                                ? 'bg-primary/5 dark:bg-primary/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[15px] ${currentAssistant?.id === ast.id ? 'text-primary' : 'text-gray-400'}`}>{ast.avatar || ast.icon || 'smart_toy'}</span>
                            <div className="flex-1">
                              <p className={`text-[13px] ${currentAssistant?.id === ast.id ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{ast.name}</p>
                              <p className="text-[9px] text-gray-400">{[ast.description || ast.desc || ast.role || 'Assistant', ast.model].filter(Boolean).join(' · ')}</p>
                            </div>
                            {currentAssistant?.id === ast.id && <span className="material-symbols-outlined text-primary text-[12px]">check</span>}
                          </button>
                      ))}
                    </>
                  )}

                  {/* Custom Assistants */}
                  {customAssistants.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mt-2">Custom Assistants</p>
                      {customAssistants.map((ast: any) => (
                          <button
                            key={ast.id}
                            onClick={() => handleAssistantSelect(ast)}
                            className={`w-full text-left px-2.5 py-2 flex items-center gap-2.5 rounded-lg transition-colors ${
                              currentAssistant?.id === ast.id
                                ? 'bg-primary/5 dark:bg-primary/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[15px] ${currentAssistant?.id === ast.id ? 'text-primary' : 'text-gray-400'}`}>{ast.avatar || 'smart_toy'}</span>
                            <div className="flex-1">
                              <p className={`text-[13px] ${currentAssistant?.id === ast.id ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{ast.name}</p>
                              <p className="text-[9px] text-gray-400">{[ast.description || ast.role || 'Custom assistant', ast.model].filter(Boolean).join(' · ')}</p>
                            </div>
                            {currentAssistant?.id === ast.id && <span className="material-symbols-outlined text-primary text-[12px]">check</span>}
                          </button>
                      ))}
                    </>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              id={`message-${index}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group transition-all duration-200 ${
                highlightedMessageIndex === index ? 'bg-yellow-50 dark:bg-yellow-900/20 -mx-4 px-4 rounded-lg' : ''
              }`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 relative shadow-sm transition-all duration-200 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary to-primary/90 text-white shadow-primary/20'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
              } ${msg.role === 'model' && highlightedMessageIndex === index ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}>
                {/* Streaming indicator for the last message */}
                {isStreaming && index === messages.length - 1 && msg.role === 'model' && msg.text && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                )}

                {/* Action buttons for all messages */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-0.5 z-10">
                  {msg.role === 'user' ? (
                    <>
                      <button
                        onClick={() => handleStartEdit(index)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="编辑消息"
                      >
                        <span className="material-symbols-outlined text-[12px] text-gray-600 dark:text-gray-300">edit</span>
                      </button>
                      <button
                        onClick={() => handleBranchFrom(index)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="从此处分叉"
                      >
                        <span className="material-symbols-outlined text-[12px] text-gray-600 dark:text-gray-300">call_split</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReplyTo(index)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="回复此消息"
                      >
                        <span className="material-symbols-outlined text-[12px] text-gray-600 dark:text-gray-300">reply</span>
                      </button>
                      <button
                        onClick={() => handleBranchFrom(index - 1)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="重新生成"
                      >
                        <span className="material-symbols-outlined text-[12px] text-gray-600 dark:text-gray-300">refresh</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="复制内容"
                  >
                    <span className="material-symbols-outlined text-[12px] text-gray-600 dark:text-gray-300">content_copy</span>
                  </button>
                    <button
                    onClick={() => {
                      if (msg.id) toggleFavorite(index);
                    }}
                    className={`p-1 rounded-full transition-colors ${
                      msg.id && favoriteMessages.has(msg.id)
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={msg.id && favoriteMessages.has(msg.id) ? '取消收藏' : '收藏消息'}
                    disabled={!msg.id}
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {msg.id && favoriteMessages.has(msg.id) ? 'star' : 'star_border'}
                    </span>
                  </button>
                </div>

                {/* Reply indicator */}
                {replyingTo === index && (
                  <div className="mb-2 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded text-xs text-primary dark:text-primary/80">
                    <span className="material-symbols-outlined text-xs align-middle mr-1">reply</span>
                    正在回复此消息
                  </div>
                )}

                {editingMessageIndex === index ? (
                  // Editing mode
                  <div className="space-y-2">
                    <textarea
                      value={editedMessageText}
                      onChange={(e) => setEditedMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(index);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="px-3 py-1 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 transition-colors"
                      >
                        Save & Resend
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : msg.role === 'model' && msg.type === 'mindmap' && msg.items ? (
                  <div className="mindmap-container">
                    <p className="text-sm font-medium mb-2">{msg.text}</p>
                    <div className="space-y-1">
                      {msg.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            readOnly
                            className="rounded"
                          />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          code: CodeBlock,
                        }}
                      >{msg.text}</ReactMarkdown>
                    </div>

                    {/* Timestamp and feedback for AI messages */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-gray-400">
                        {messageTimestamps[index] && new Date(messageTimestamps[index]).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      {/* Feedback buttons for AI messages */}
                      {msg.role === 'model' && !loading && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFeedback(index, 'up')}
                            className={`p-0.5 rounded transition-colors ${
                              messageFeedback[index] === 'up'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title="Good response"
                          >
                            <span className="material-symbols-outlined text-[11px]">thumb_up</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(index, 'down')}
                            className={`p-0.5 rounded transition-colors ${
                              messageFeedback[index] === 'down'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                            title="Poor response"
                          >
                            <span className="material-symbols-outlined text-[11px]">thumb_down</span>
                          </button>
                          {/* 导入到编辑器按钮 */}
                          {onImportToEditor && activeNote && (
                            <div className="relative group/import">
                              <button
                                onClick={() => handleImportToEditorClick(msg.text, 'append')}
                                className="p-0.5 rounded transition-colors text-gray-400 hover:text-primary hover:bg-primary/10"
                                title="导入到编辑器"
                              >
                                <span className="material-symbols-outlined text-[11px]">download</span>
                              </button>
                              {/* 导入选项下拉菜单 */}
                              <div className="absolute bottom-full right-0 mb-1 hidden group-hover/import:block z-20">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[100px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImportToEditorClick(msg.text, 'append');
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">add</span>
                                    追加
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImportToEditorClick(msg.text, 'insert');
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">input</span>
                                    插入
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImportToEditorClick(msg.text, 'replace');
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-500"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">sync_alt</span>
                                    替换全部
                                  </button>
                                  {/* 应用到选中区域 */}
                                  {selection?.text && (
                                    <>
                                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 直接替换选中内容
                                          if (editorRef?.current && editorRef.current.replaceContent) {
                                            const convertedContent = currentNoteType 
                                              ? convertAIResponseForEditor(msg.text, currentNoteType)
                                              : msg.text;
                                            editorRef.current.replaceContent(convertedContent);
                                          }
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                                      >
                                        <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                                        应用到选中区域
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === 'model' && !messages[messages.length - 1]?.text && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Actions */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
        {/* 笔记内容交互按钮 */}
        {activeNote && (
          <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest">笔记内容</p>
              {/* 笔记统计信息 */}
              {noteStats && (
                <div className="flex items-center gap-2 text-[8px] text-gray-400">
                  <span>{noteStats.charCount} 字</span>
                  <span>•</span>
                  <span>{noteStats.lineCount} 行</span>
                  {noteStats.typeSpecific.map((stat, idx) => (
                    <React.Fragment key={stat.label}>
                      <span>•</span>
                      <span>{stat.value} {stat.label}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={handleSendNoteContent}
                className="size-7 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                title="发送整个笔记内容给AI分析"
              >
                <span className="material-symbols-outlined text-[11px]">description</span>
                <span className="sr-only">发送笔记内容</span>
              </button>
              <button
                onClick={handleSendSelection}
                disabled={!selection?.text}
                className={`size-7 flex items-center justify-center rounded-lg transition-colors border ${
                  selection?.text
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                }`}
                title={selection?.text ? `发送选中内容 (${selection.text.length})` : '请先在编辑器中选择内容'}
              >
                <span className="material-symbols-outlined text-[11px]">select_all</span>
                <span className="sr-only">发送选中内容</span>
              </button>
              
              {/* AI回复导入按钮 */}
              {messages.length > 0 && messages[messages.length - 1]?.role === 'model' && messages[messages.length - 1]?.text && (
                <>
                  <button
                    onClick={() => handleImportToEditorClick(messages[messages.length - 1].text, 'append')}
                    className="size-7 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    title="将最新AI回复追加到笔记末尾"
                  >
                    <span className="material-symbols-outlined text-[11px]">add</span>
                    <span className="sr-only">追加</span>
                  </button>
                  <button
                    onClick={() => handleImportToEditorClick(messages[messages.length - 1].text, 'insert')}
                    className="size-7 flex items-center justify-center bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
                    title="将最新AI回复插入到光标位置"
                  >
                    <span className="material-symbols-outlined text-[11px]">input</span>
                    <span className="sr-only">插入</span>
                  </button>
                  <button
                    onClick={() => handleImportToEditorClick(messages[messages.length - 1].text, 'replace')}
                    className="size-7 flex items-center justify-center bg-primary/5 dark:bg-primary/20 hover:bg-primary/10 dark:hover:bg-primary/30 text-primary dark:text-primary rounded-lg transition-colors border border-primary/20 dark:border-primary/40"
                    title="用最新AI回复替换整个笔记内容"
                  >
                    <span className="material-symbols-outlined text-[11px]">sync_alt</span>
                    <span className="sr-only">替换全部</span>
                  </button>
                </>
              )}
            </div>
            
            {/* 选中内容预览卡片 */}
            {selection?.text && (
              <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">format_quote</span>
                    选中内容预览
                    <span className="px-1 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded text-[8px]">
                      {selection.text.length} 字符
                    </span>
                  </span>
                   <button
                     onClick={() => {
                       // 清除选中
                       useNoteAIStore.getState().setSelection(null);
                     }}
                     className="text-[8px] text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-300"
                     title="清除选中"
                  >
                    <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 line-clamp-2 whitespace-pre-wrap mb-2">
                  {selection.text.length > 150 ? selection.text.slice(0, 150) + '...' : selection.text}
                </p>
                {/* 快速提问按钮 */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => {
                      setInput(`请解释以下内容：\n\n${selection.text}`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="px-2 py-0.5 text-[8px] bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded transition-colors"
                  >
                    解释
                  </button>
                  <button
                    onClick={() => {
                      setInput(`请翻译以下内容：\n\n${selection.text}`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="px-2 py-0.5 text-[8px] bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded transition-colors"
                  >
                    翻译
                  </button>
                  <button
                    onClick={() => {
                      setInput(`请改写以下内容，使其更加专业：\n\n${selection.text}`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="px-2 py-0.5 text-[8px] bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded transition-colors"
                  >
                    改写
                  </button>
                  <button
                    onClick={() => {
                      setInput(`请总结以下内容的要点：\n\n${selection.text}`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="px-2 py-0.5 text-[8px] bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded transition-colors"
                  >
                    总结
                  </button>
                  <button
                    onClick={() => {
                      setInput(`请扩展以下内容，添加更多细节：\n\n${selection.text}`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="px-2 py-0.5 text-[8px] bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded transition-colors"
                  >
                    扩展
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* AI响应历史面板 */}
        {aiResponseHistory.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowResponseHistory(!showResponseHistory)}
              className="w-full flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
            >
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">history</span>
                AI响应历史
                <span className="px-1.5 py-0.5 text-[8px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full font-normal">
                  {aiResponseHistory.length}
                </span>
              </span>
              <span className={`material-symbols-outlined text-[14px] transition-transform ${showResponseHistory ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            
            {showResponseHistory && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => clearResponseHistory()}
                    className="text-[8px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[10px]">delete_sweep</span>
                    清空历史
                  </button>
                </div>
                
                {aiResponseHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg border transition-all ${
                      item.imported 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                        : 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                        {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {item.imported && (
                          <span className="ml-1 px-1 py-0.5 text-[7px] bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded">
                            已导入
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            // 重新导入
                            setPreviewContent(item.content);
                            setPreviewMode('append');
                            setShowImportPreview(true);
                            markAsImported(item.id);
                          }}
                          className="p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800/50 rounded transition-colors"
                          title="导入到编辑器"
                        >
                          <span className="material-symbols-outlined text-[12px]">input</span>
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.content);
                            // 简单的复制成功提示
                            const btn = document.activeElement as HTMLButtonElement;
                            if (btn) {
                              const original = btn.innerHTML;
                              btn.innerHTML = '<span class="material-symbols-outlined text-[12px]">check</span>';
                              setTimeout(() => { btn.innerHTML = original; }, 1000);
                            }
                          }}
                          className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="复制内容"
                        >
                          <span className="material-symbols-outlined text-[12px]">content_copy</span>
                        </button>
                        <button
                          onClick={() => removeFromHistory(item.id)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
                      {item.preview}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions removed from here */}
      </div>


      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#15232a]">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
              >
                <span className="material-symbols-outlined text-sm text-primary">{getFileIcon(attachment.file.name)}</span>
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {attachment.uploading ? 'Uploading...' : attachment.file.name}
                </span>
                {attachment.error && <span className="text-red-500">❌</span>}
                {!attachment.uploading && (
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-gray-400">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">


          {/* Voice Input Button */}
          {recognition && (
            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-xl transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white dark:bg-[#1c2b33] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              <span className="material-symbols-outlined text-sm">mic</span>
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.aiPanel.askPlaceholder || "Ask me anything..."}
            className="flex-1 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none transition-shadow placeholder-gray-400"
            rows={1}
            disabled={loading && !isStreaming}
            style={{ minHeight: '40px', maxHeight: '200px' }}
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              title="Stop generating"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 bg-primary hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              title="Send message"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleNewChat}
              className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
              title="开始新对话 (Ctrl+Shift+K)"
            >
              <span className="material-symbols-outlined text-[12px]">add_circle</span>
              新对话
            </button>
            {messages.length > 1 && (
              <button
                onClick={handleClearChat}
                className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
                title="清空当前对话"
              >
                <span className="material-symbols-outlined text-[12px]">restart_alt</span>
                清空
              </button>
            )}
            {lastUserPrompt && (
              <button
                onClick={handleRegenerate}
                disabled={loading || regenerating}
                className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
                title="重新生成 (Ctrl+R)"
              >
                <span className="material-symbols-outlined text-[12px]">
                  {regenerating ? 'refresh' : 'autorenew'}
                </span>
                {regenerating ? '重生成中...' : '重新生成'}
              </button>
            )}
            {messages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
                  title="导出对话 (Ctrl+E)"
                >
                  <span className="material-symbols-outlined text-[12px]">download</span>
                  导出
                  <span className={`material-symbols-outlined text-[10px] transition-transform ${showExportMenu ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {showExportMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => {
                        handleExportConversation('markdown');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-gray-500">description</span>
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportConversation('json');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-gray-500">code</span>
                      <span>JSON (.json)</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportConversation('txt');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-gray-500">text_snippet</span>
                      <span>纯文本 (.txt)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setMessageSearchOpen(!messageSearchOpen)}
              className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
              title="搜索消息"
            >
              <span className="material-symbols-outlined text-[12px]">search</span>
              搜索
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
              title="快捷回复"
            >
              <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
              快捷
            </button>
            <button
              onClick={exportAllData}
              className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-400 rounded-lg transition-colors flex items-center gap-1"
              title="导出全部数据"
            >
              <span className="material-symbols-outlined text-[12px]">download</span>
              导出
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {messageSearchOpen && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={messageSearchQuery}
                onChange={(e) => handleMessageSearch(e.target.value)}
                placeholder="搜索消息内容..."
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                autoFocus
              />
              <button
                onClick={() => handleNavigateSearch('prev')}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="上一个"
              >
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
              </button>
              <button
                onClick={() => handleNavigateSearch('next')}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="下一个"
              >
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
              </button>
              <button
                onClick={() => {
                  setMessageSearchOpen(false);
                  setMessageSearchQuery('');
                  setHighlightedMessageIndex(null);
                }}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="关闭"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            {messageSearchQuery && (
              <div className="mt-1 text-[9px] text-gray-500">
                {highlightedMessageIndex !== null ? `已找到第 ${highlightedMessageIndex + 1} 条消息` : '未找到匹配消息'}
              </div>
            )}
          </div>
        )}

        {/* Quick Reply Templates & Smart Actions */}
        {showTemplates && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
             {/* Smart Actions (Context Aware) */}
             <div>
              <div className="text-[9px] text-gray-500 mb-1.5 px-1 font-medium">智能操作</div>
              <div className="flex flex-wrap gap-1.5">
                {smartActions.slice(0, 5).map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleSmartAction(action)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-md text-[9px] text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[9px]">{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Existing Quick Replies */}
            <div>
              <div className="text-[9px] text-gray-500 mb-1.5 px-1 font-medium">快捷回复</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertQuickReply(reply.text)}
                    className="text-[9px] px-1.5 py-0.5 bg-white dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-gray-200 dark:border-gray-700 rounded-md transition-colors"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom Prompts Manager */}
        {showPromptManager && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {/* Header with title and add button */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-[9px] text-gray-500 font-medium">提示词库</div>
              <button
                onClick={() => {
                  const name = window.prompt('提示词名称:');
                  const promptText = window.prompt('提示词内容:');
                  const category = window.prompt('类别 (code/writing/analysis/custom):', 'custom');
                  if (name && promptText) {
                    addCustomPrompt(name, promptText, category || undefined);
                  }
                }}
                className="text-[9px] text-primary hover:text-primary/80 flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[10px]">add</span>
                添加
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {['all', 'code', 'writing', 'analysis', 'custom'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedPromptCategory(cat)}
                  className={`text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    selectedPromptCategory === cat
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getCategoryName(cat)}
                </button>
              ))}
            </div>

            {/* Prompts list */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {getFilteredPrompts().map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => insertQuickReply(p.prompt)}
                    className="flex-1 text-left text-[10px] px-2 py-1.5 bg-white dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-gray-700 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {p.icon && (
                        <span className="material-symbols-outlined text-[10px] text-gray-400">{p.icon}</span>
                      )}
                      <span className="font-medium truncate">{p.name}</span>
                      {p.isSystem && (
                        <span className="text-[7px] px-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">系统</span>
                      )}
                    </div>
                    <div className="text-gray-400 truncate text-[8px]">{p.prompt}</div>
                  </button>
                  {!p.isSystem && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const newName = window.prompt('编辑名称:', p.name);
                          const newPrompt = window.prompt('编辑内容:', p.prompt);
                          if (newName && newPrompt) {
                            updateCustomPrompt(p.id, newName, newPrompt);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`删除提示词 "${p.name}"?`)) {
                            deleteCustomPrompt(p.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <span className="material-symbols-outlined text-[10px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {getFilteredPrompts().length === 0 && (
                <div className="text-center py-4 text-[9px] text-gray-400">
                  该类别下暂无提示词
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-2 text-[8px] text-gray-500 dark:text-gray-500 flex items-center gap-2">
          <span>⌨️</span>
          <span>Ctrl+Enter to send</span>
          <span>•</span>
          <span>Esc to stop</span>
          <span>•</span>
          <span>Ctrl+E export</span>
          <span>•</span>
          <span>Ctrl+R regenerate</span>
        </div>
      </div>

      {/* 导入预览模态框 */}
      {showImportPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">preview</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">预览导入内容</h3>
                {currentNoteType && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    currentNoteType === 'Markdown' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                    currentNoteType === 'Rich Text' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    currentNoteType === 'Mind Map' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {currentNoteType}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowImportPreview(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* 导入模式选择 */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">导入方式</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('append')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    previewMode === 'append'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  追加到末尾
                </button>
                <button
                  onClick={() => setPreviewMode('insert')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    previewMode === 'insert'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">input</span>
                  插入到光标
                </button>
                <button
                  onClick={() => setPreviewMode('replace')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    previewMode === 'replace'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                  替换全部
                </button>
              </div>
            </div>

            {/* 内容编辑区域 */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">edit</span>
                  可直接编辑内容后导入
                </p>
                <button
                  onClick={() => setPreviewContent(previewContent.trim())}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
                  title="去除首尾空白"
                >
                  <span className="material-symbols-outlined text-[12px]">format_clear</span>
                  去除空白
                </button>
              </div>
              <textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="w-full h-[300px] p-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="将要导入的内容..."
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>内容长度: {previewContent.length} 字符</span>
                <span>行数: {previewContent.split('\n').length}</span>
              </div>
            </div>

            {/* 模态框底部 */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowImportPreview(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AIPanel;
