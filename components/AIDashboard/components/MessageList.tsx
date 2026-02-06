/**
 * MessageList - 消息列表组件
 * 显示整个聊天消息列表，支持虚拟滚动
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '../../../types';
import { BubbleTheme } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingText?: string;
  
  // 显示选项
  theme?: BubbleTheme;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  showDateDividers?: boolean;
  
  // 书签和选择
  bookmarkedIndices?: number[];
  selectedIndices?: number[];
  
  // 搜索高亮
  searchQuery?: string;
  highlightedIndex?: number;
  
  // 回调
  onBookmark?: (index: number) => void;
  onSelect?: (index: number) => void;
  onEdit?: (index: number, newText: string) => void;
  onDelete?: (index: number) => void;
  onCopy?: (text: string) => void;
  onReply?: (message: ChatMessage) => void;
  onRegenerate?: (index: number) => void;
  onRate?: (index: number, rating: 1 | 2 | 3 | 4 | 5) => void;
  onScrollToBottom?: () => void;
  
  // 用户信息
  userName?: string;
  userAvatar?: string;
  assistantName?: string;
  assistantAvatar?: string;
  
  // 空状态
  emptyState?: React.ReactNode;
  
  className?: string;
}

// 日期分隔符
const DateDivider: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-4 py-4">
    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
      {date}
    </span>
    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
  </div>
);

// 流式输入指示器
const StreamingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-4 py-2">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-xs text-gray-500 ml-1">AI 正在思考...</span>
  </div>
);

// 格式化日期
const formatDateLabel = (timestamp: Date | number | string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  }
};

// 检查是否需要日期分隔符
const shouldShowDateDivider = (
  currentMessage: ChatMessage,
  prevMessage: ChatMessage | undefined
): boolean => {
  if (!prevMessage || !currentMessage.timestamp || !prevMessage.timestamp) {
    return false;
  }
  
  const currentDate = new Date(currentMessage.timestamp).toDateString();
  const prevDate = new Date(prevMessage.timestamp).toDateString();
  
  return currentDate !== prevDate;
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
  streamingText = '',
  theme = 'default',
  showTimestamps = true,
  showAvatars = true,
  showDateDividers = true,
  bookmarkedIndices = [],
  selectedIndices = [],
  searchQuery = '',
  highlightedIndex,
  onBookmark,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onReply,
  onRegenerate,
  onRate,
  onScrollToBottom,
  userName = '你',
  userAvatar,
  assistantName = 'AI',
  assistantAvatar = '🤖',
  emptyState,
  className = '',
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    onScrollToBottom?.();
  }, [onScrollToBottom]);

  // 检测滚动位置
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 5);
  }, [messages.length]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length, autoScroll, scrollToBottom]);

  // 流式输出时滚动
  useEffect(() => {
    if (isStreaming && autoScroll) {
      scrollToBottom(false);
    }
  }, [isStreaming, streamingText, autoScroll, scrollToBottom]);

  // 高亮消息时滚动到该位置
  useEffect(() => {
    if (highlightedIndex !== undefined && listRef.current) {
      const element = listRef.current.querySelector(`[data-message-index="${highlightedIndex}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedIndex]);

  // 处理的消息列表 (带日期分组)
  const processedMessages = useMemo(() => {
    if (!showDateDividers) {
      return messages.map((msg, index) => ({ type: 'message' as const, message: msg, index }));
    }

    const result: Array<
      | { type: 'divider'; date: string }
      | { type: 'message'; message: ChatMessage; index: number }
    > = [];

    messages.forEach((msg, index) => {
      if (shouldShowDateDivider(msg, messages[index - 1])) {
        result.push({
          type: 'divider',
          date: formatDateLabel(msg.timestamp!),
        });
      }
      result.push({ type: 'message', message: msg, index });
    });

    return result;
  }, [messages, showDateDividers]);

  // 空状态
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className={`flex-1 flex items-center justify-center p-8 ${className}`}>
        {emptyState || (
          <div className="text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">chat</span>
            <p>开始对话吧</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex-1 overflow-hidden ${className}`}>
      <div
        ref={listRef}
        className="h-full overflow-y-auto px-4 py-4 space-y-4"
        onScroll={handleScroll}
      >
        {processedMessages.map((item, i) => {
          if (item.type === 'divider') {
            return <DateDivider key={`divider-${i}`} date={item.date} />;
          }

          const { message, index } = item;
          const isUser = message.role === 'user';

          return (
            <div key={message.id || index} data-message-index={index}>
              <MessageBubble
                message={message}
                index={index}
                isUser={isUser}
                theme={theme}
                showTimestamp={showTimestamps}
                showAvatar={showAvatars}
                isBookmarked={bookmarkedIndices.includes(index)}
                isSelected={selectedIndices.includes(index)}
                isHighlighted={highlightedIndex === index}
                onBookmark={onBookmark}
                onSelect={onSelect}
                onEdit={isUser ? onEdit : undefined}
                onDelete={onDelete}
                onCopy={onCopy}
                onReply={onReply}
                onRegenerate={!isUser ? onRegenerate : undefined}
                onRate={!isUser ? onRate : undefined}
                userName={userName}
                userAvatar={userAvatar}
                assistantName={assistantName}
                assistantAvatar={assistantAvatar}
              />
            </div>
          );
        })}

        {/* 流式输出中的消息 */}
        {isStreaming && streamingText && (
          <div data-message-index={messages.length}>
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'model',
                text: streamingText,
                timestamp: new Date(),
              }}
              index={messages.length}
              isUser={false}
              theme={theme}
              showTimestamp={false}
              showAvatar={showAvatars}
              showActions={false}
              assistantName={assistantName}
              assistantAvatar={assistantAvatar}
            />
          </div>
        )}

        {/* 正在输入指示器 */}
        {isStreaming && !streamingText && <StreamingIndicator />}
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
        >
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">
            keyboard_arrow_down
          </span>
        </button>
      )}
    </div>
  );
};
