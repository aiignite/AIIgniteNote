import React from 'react';

interface ReplyingMessage {
  text: string;
}

interface ReplyQuotePreviewProps {
  replyingToMessage: ReplyingMessage | null;
  onCancelQuote: () => void;
}

/**
 * 引用回复预览组件
 * 显示正在引用回复的消息预览
 */
export const ReplyQuotePreview: React.FC<ReplyQuotePreviewProps> = ({
  replyingToMessage,
  onCancelQuote,
}) => {
  if (!replyingToMessage) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 -mx-4 -mt-4 mb-3 p-3 rounded-t-3xl">
      <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">format_quote</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">引用回复</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{replyingToMessage.text}</p>
      </div>
      <button
        onClick={onCancelQuote}
        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        title="取消引用"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
