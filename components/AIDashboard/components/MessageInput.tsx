/**
 * MessageInput - 消息输入组件
 * 包含输入框、发送按钮、附件上传等功能
 */

import React, { useState, useRef, useCallback, useEffect, KeyboardEvent, DragEvent } from 'react';
import { ProcessedFile, processFileForAI, formatFileSize, getFileIcon } from '../../../services/fileProcessor';

interface MessageInputProps {
  // 输入状态
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, attachments?: ProcessedFile[]) => void;
  onStop?: () => void;

  // 状态标志
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;

  // 附件
  attachments?: File[];
  processedFiles?: ProcessedFile[];
  onFilesChange?: (files: File[], processed: ProcessedFile[]) => void;
  maxFiles?: number;

  // 可选功能
  showVoiceInput?: boolean;
  showTemplates?: boolean;
  showSlashCommands?: boolean;
  replyingTo?: { id: string; text: string } | null;
  onCancelReply?: () => void;

  // 样式
  className?: string;
}

// 斜杠命令类型
interface SlashCommand {
  command: string;
  label: string;
  icon: string;
  description: string;
  action: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  disabled = false,
  isLoading = false,
  placeholder = '输入消息...',
  attachments = [],
  processedFiles = [],
  onFilesChange,
  maxFiles = 5,
  showVoiceInput = false,
  showTemplates = false,
  showSlashCommands = true,
  replyingTo = null,
  onCancelReply,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 内部状态
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // 检测斜杠命令
  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowSlashMenu(true);
      setSlashFilter(value.slice(1).toLowerCase());
      setSelectedSlashIndex(0);
    } else {
      setShowSlashMenu(false);
      setSlashFilter('');
    }
  }, [value]);

  // 发送消息
  const handleSend = useCallback(() => {
    if (disabled || isLoading) return;
    const trimmedText = value.trim();
    if (!trimmedText && processedFiles.length === 0) return;
    
    onSend(trimmedText, processedFiles.length > 0 ? processedFiles : undefined);
    onChange('');
    
    // 清空附件
    if (onFilesChange) {
      onFilesChange([], []);
    }
  }, [value, processedFiles, disabled, isLoading, onSend, onChange, onFilesChange]);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 斜杠命令菜单导航
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex(prev => prev + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // 执行选中的命令
        setShowSlashMenu(false);
        onChange('');
        return;
      } else if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }
    
    // 普通发送
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [showSlashMenu, handleSend, onChange]);

  // 文件处理
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!onFilesChange) return;
    
    const fileArray = Array.from(files).slice(0, maxFiles - attachments.length);
    if (fileArray.length === 0) return;
    
    setProcessingFiles(true);
    
    try {
      const newProcessed: ProcessedFile[] = [];
      for (const file of fileArray) {
        const processed = await processFileForAI(file);
        newProcessed.push(processed);
      }
      
      onFilesChange(
        [...attachments, ...fileArray],
        [...processedFiles, ...newProcessed]
      );
    } catch (error) {
      console.error('Failed to process files:', error);
    } finally {
      setProcessingFiles(false);
    }
  }, [attachments, processedFiles, maxFiles, onFilesChange]);

  // 拖拽处理
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // 移除附件
  const removeAttachment = useCallback((index: number) => {
    if (!onFilesChange) return;
    
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newProcessed = processedFiles.filter((_, i) => i !== index);
    onFilesChange(newAttachments, newProcessed);
  }, [attachments, processedFiles, onFilesChange]);

  return (
    <div 
      className={`relative ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽覆盖层 */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center z-10">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
            <p className="text-primary font-medium mt-2">放开以上传文件</p>
          </div>
        </div>
      )}

      {/* 引用回复 */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-l-4 border-primary rounded-t-xl">
          <span className="material-symbols-outlined text-sm text-gray-400">reply</span>
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
            {replyingTo.text}
          </span>
          <button
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* 附件预览 */}
      {processedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
          {processedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <span className="material-symbols-outlined text-sm text-gray-500">
                {getFileIcon(file.type)}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {file.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatFileSize(attachments[index]?.size || 0)}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          {processingFiles && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-600 rounded-lg">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">处理中...</span>
            </div>
          )}
        </div>
      )}

      {/* 输入框容器 - 固定高度避免跳动 */}
      <div className={`flex items-end gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[44px] ${
        disabled ? 'opacity-50' : ''
      }`}>
        
        {/* 附件按钮 */}
        {onFilesChange && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || attachments.length >= maxFiles}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            title="添加附件"
          >
            <span className="material-symbols-outlined text-lg">attach_file</span>
          </button>
        )}
        
        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 max-h-[200px] min-h-[24px]"
          style={{ lineHeight: '1.5' }}
        />
        
        {/* 语音输入按钮 */}
        {showVoiceInput && (
          <button
            onClick={() => setIsListening(!isListening)}
            disabled={disabled}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-100 text-red-600 animate-pulse' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={isListening ? '停止录音' : '语音输入'}
          >
            <span className="material-symbols-outlined">
              {isListening ? 'stop_circle' : 'mic'}
            </span>
          </button>
        )}
        
        {/* 发送/停止按钮 */}
        {isLoading ? (
          <button
            onClick={onStop}
            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            title="停止生成"
          >
            <span className="material-symbols-outlined text-lg">stop</span>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || (!value.trim() && processedFiles.length === 0)}
            className="p-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="发送消息"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.csv,.xlsx"
      />

      {/* 斜杠命令菜单 */}
      {showSlashMenu && showSlashCommands && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-[300px] overflow-y-auto">
          <div className="p-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
            快捷命令 - 输入 / 开始
          </div>
          <div className="p-2">
            {/* 命令列表会根据 slashFilter 过滤 */}
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              输入命令名称以筛选
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
