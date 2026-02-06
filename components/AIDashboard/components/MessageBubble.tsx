/**
 * MessageBubble - 消息气泡组件
 * 显示单条聊天消息，支持用户/AI角色区分
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChatMessage } from '../../../types';
import { BubbleTheme } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  
  // 显示选项
  isUser: boolean;
  showTimestamp?: boolean;
  showActions?: boolean;
  showAvatar?: boolean;
  theme?: BubbleTheme;
  
  // 状态
  isBookmarked?: boolean;
  isSelected?: boolean;
  isPinned?: boolean;
  isEditing?: boolean;
  isHighlighted?: boolean;
  
  // 回调
  onBookmark?: (index: number) => void;
  onSelect?: (index: number) => void;
  onEdit?: (index: number, newText: string) => void;
  onDelete?: (index: number) => void;
  onCopy?: (text: string) => void;
  onReply?: (message: ChatMessage) => void;
  onRegenerate?: (index: number) => void;
  onRate?: (index: number, rating: 1 | 2 | 3 | 4 | 5) => void;
  
  // 用户/助手信息
  userName?: string;
  userAvatar?: string;
  assistantName?: string;
  assistantAvatar?: string;
  
  className?: string;
}

// 主题样式配置
const themeStyles: Record<BubbleTheme, { user: string; assistant: string }> = {
  default: {
    user: 'bg-primary text-white rounded-2xl rounded-br-md',
    assistant: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-md',
  },
  minimal: {
    user: 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-xl',
    assistant: 'bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 rounded-xl',
  },
  gradient: {
    user: 'bg-gradient-to-r from-primary to-purple-500 text-white rounded-2xl rounded-br-md shadow-lg',
    assistant: 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-md',
  },
  glass: {
    user: 'bg-primary/90 backdrop-blur-sm text-white rounded-2xl rounded-br-md border border-white/20',
    assistant: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-2xl rounded-bl-md border border-gray-200/50 dark:border-gray-700/50',
  },
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  index,
  isUser,
  showTimestamp = true,
  showActions = true,
  showAvatar = true,
  theme = 'default',
  isBookmarked = false,
  isSelected = false,
  isPinned = false,
  isEditing = false,
  isHighlighted = false,
  onBookmark,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onReply,
  onRegenerate,
  onRate,
  userName = '你',
  userAvatar,
  assistantName = 'AI',
  assistantAvatar = '🤖',
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [editText, setEditText] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // 主题样式
  const bubbleStyle = useMemo(() => {
    const styles = themeStyles[theme] || themeStyles.default;
    return isUser ? styles.user : styles.assistant;
  }, [theme, isUser]);

  // 格式化时间
  const formatTime = useMemo(() => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  // 复制文本
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedFeedback(true);
      onCopy?.(message.text);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [message.text, onCopy]);

  // 开始编辑
  const startEdit = useCallback(() => {
    setEditText(message.text);
    setIsEditMode(true);
    setShowMenu(false);
  }, [message.text]);

  // 保存编辑
  const saveEdit = useCallback(() => {
    if (editText.trim() && onEdit) {
      onEdit(index, editText.trim());
    }
    setIsEditMode(false);
  }, [editText, index, onEdit]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    setEditText('');
  }, []);

  // 渲染头像
  const renderAvatar = () => {
    if (!showAvatar) return null;
    
    if (isUser) {
      return userAvatar ? (
        <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-sm">person</span>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
          {typeof assistantAvatar === 'string' && assistantAvatar.length <= 2 ? (
            <span className="text-lg">{assistantAvatar}</span>
          ) : (
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-sm">smart_toy</span>
          )}
        </div>
      );
    }
  };

  return (
    <div 
      className={`flex gap-3 group relative ${isUser ? 'flex-row-reverse' : ''} ${
        isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-2' : ''
      } ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2 rounded-xl' : ''} ${className}`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => !isEditMode && setShowMenu(false)}
    >
      {/* 头像 */}
      {renderAvatar()}

      {/* 消息内容区域 */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* 名称和时间 */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isUser ? userName : assistantName}
          </span>
          {showTimestamp && formatTime && (
            <span className="text-xs text-gray-400">{formatTime}</span>
          )}
          {isPinned && (
            <span className="material-symbols-outlined text-yellow-500 text-xs">push_pin</span>
          )}
          {isBookmarked && (
            <span className="material-symbols-outlined text-yellow-500 text-xs">bookmark</span>
          )}
        </div>

        {/* 消息气泡 */}
        <div className={`px-4 py-2.5 ${bubbleStyle} relative`}>
          {isEditMode ? (
            <div className="min-w-[200px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 rounded-lg p-2 text-sm outline-none resize-none min-h-[60px]"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={cancelEdit}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={saveEdit}
                  className="px-2 py-1 text-xs bg-primary text-white rounded"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 消息文本 */}
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.text}
              </div>
              
              {/* 附件预览 */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.attachments.map((att, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded text-xs"
                    >
                      <span className="material-symbols-outlined text-xs">attachment</span>
                      {att.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 评分显示 */}
              {message.rating && (
                <div className="flex items-center gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`material-symbols-outlined text-sm ${
                        star <= message.rating! ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                      }`}
                    >
                      star
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 操作按钮 */}
        {showActions && showMenu && !isEditMode && (
          <div className={`flex items-center gap-0.5 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* 复制 */}
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="复制"
            >
              <span className="material-symbols-outlined text-sm">
                {copiedFeedback ? 'check' : 'content_copy'}
              </span>
            </button>

            {/* 书签 */}
            {onBookmark && (
              <button
                onClick={() => onBookmark(index)}
                className={`p-1 rounded transition-colors ${
                  isBookmarked 
                    ? 'text-yellow-500 hover:text-yellow-600' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title={isBookmarked ? '取消书签' : '添加书签'}
              >
                <span className="material-symbols-outlined text-sm">
                  {isBookmarked ? 'bookmark' : 'bookmark_border'}
                </span>
              </button>
            )}

            {/* 回复 */}
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="引用回复"
              >
                <span className="material-symbols-outlined text-sm">reply</span>
              </button>
            )}

            {/* 编辑 (仅用户消息) */}
            {isUser && onEdit && (
              <button
                onClick={startEdit}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="编辑"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            )}

            {/* 重新生成 (仅 AI 消息) */}
            {!isUser && onRegenerate && (
              <button
                onClick={() => onRegenerate(index)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="重新生成"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
            )}

            {/* 评分 (仅 AI 消息) */}
            {!isUser && onRate && (
              <div className="flex items-center ml-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => onRate(index, star as 1 | 2 | 3 | 4 | 5)}
                    className={`p-0.5 transition-colors ${
                      message.rating && star <= message.rating
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">star</span>
                  </button>
                ))}
              </div>
            )}

            {/* 删除 */}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('确定要删除这条消息吗？')) {
                    onDelete(index);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="删除"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
