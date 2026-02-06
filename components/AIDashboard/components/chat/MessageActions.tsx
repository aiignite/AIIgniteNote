import React from 'react';

interface MessageActionsProps {
  messageIndex: number;
  isFocused: boolean;
  collapsedMessages: Set<number>;
  messageFeedback: Record<number, 'like' | 'dislike'>;
  messageReactions: Record<number, string[]>;
  translatedMessages: Record<number, string>;
  translatingIndex: number | null;
  userHighlightedMsgs: Set<number>;
  messageReferenceChain: number[];
  showReactionPicker: number | null;
  reactionEmojis: string[];
  onSetFeedback: (index: number, feedback: 'like' | 'dislike') => void;
  onToggleCollapse: (index: number) => void;
  onToggleReactionPicker: (index: number | null) => void;
  onAddReaction: (index: number, emoji: string) => void;
  onTranslate: (index: number, text: string, lang: string) => void;
  onToggleHighlight: (index: number) => void;
  onAddToReferenceChain: (index: number) => void;
  messageText: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageIndex,
  isFocused,
  collapsedMessages,
  messageFeedback,
  messageReactions,
  translatedMessages,
  translatingIndex,
  userHighlightedMsgs,
  messageReferenceChain,
  showReactionPicker,
  reactionEmojis,
  onSetFeedback,
  onToggleCollapse,
  onToggleReactionPicker,
  onAddReaction,
  onTranslate,
  onToggleHighlight,
  onAddToReferenceChain,
  messageText
}) => {
  return (
    <div className={`flex items-center gap-1 mt-2 transition-opacity ${
      isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
    }`}>
      {/* 点赞按钮 */}
      <button
        onClick={() => onSetFeedback(messageIndex, 'like')}
        className={`p-1.5 rounded-lg transition-colors ${
          messageFeedback[messageIndex] === 'like'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
        }`}
        title="有帮助"
      >
        <span className="material-symbols-outlined text-sm">thumb_up</span>
      </button>
      
      {/* 踩按钮 */}
      <button
        onClick={() => onSetFeedback(messageIndex, 'dislike')}
        className={`p-1.5 rounded-lg transition-colors ${
          messageFeedback[messageIndex] === 'dislike'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
        }`}
        title="需改进"
      >
        <span className="material-symbols-outlined text-sm">thumb_down</span>
      </button>
      
      {/* 折叠按钮 */}
      <button
        onClick={() => onToggleCollapse(messageIndex)}
        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
        title={collapsedMessages.has(messageIndex) ? '展开消息' : '折叠消息'}
      >
        <span className="material-symbols-outlined text-sm">
          {collapsedMessages.has(messageIndex) ? 'expand_more' : 'expand_less'}
        </span>
      </button>

      {/* 表情反应按钮 */}
      <div className="relative">
        <button
          onClick={() => onToggleReactionPicker(showReactionPicker === messageIndex ? null : messageIndex)}
          className={`p-1.5 rounded-lg transition-colors ${
            (messageReactions[messageIndex]?.length || 0) > 0
              ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
          }`}
          title="添加反应"
        >
          <span className="material-symbols-outlined text-sm">add_reaction</span>
        </button>
        {showReactionPicker === messageIndex && (
          <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg p-1.5 z-30 animate-in fade-in slide-in-from-bottom-2">
            {reactionEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => onAddReaction(messageIndex, emoji)}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all hover:scale-125 ${
                  messageReactions[messageIndex]?.includes(emoji) ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 翻译按钮 */}
      <button
        onClick={() => onTranslate(messageIndex, messageText, 'en')}
        disabled={translatingIndex === messageIndex}
        className={`p-1.5 rounded-lg transition-colors ${
          translatedMessages[messageIndex]
            ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/30'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
        } ${translatingIndex === messageIndex ? 'animate-pulse' : ''}`}
        title={translatedMessages[messageIndex] ? '查看翻译' : '翻译成英文'}
      >
        <span className="material-symbols-outlined text-sm">translate</span>
      </button>

      {/* 高亮按钮 */}
      <button
        onClick={() => onToggleHighlight(messageIndex)}
        className={`p-1.5 rounded-lg transition-colors ${
          userHighlightedMsgs.has(messageIndex)
            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
        }`}
        title={userHighlightedMsgs.has(messageIndex) ? '取消高亮' : '高亮消息'}
      >
        <span className="material-symbols-outlined text-sm">highlight</span>
      </button>

      {/* 添加到引用链按钮 */}
      <button
        onClick={() => onAddToReferenceChain(messageIndex)}
        className={`p-1.5 rounded-lg transition-colors ${
          messageReferenceChain.includes(messageIndex)
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
        }`}
        title="添加到引用链"
      >
        <span className="material-symbols-outlined text-sm">link</span>
      </button>

      {/* 键盘导航聚焦指示 */}
      {isFocused && (
        <span className="ml-2 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] rounded-full">
          ⌨️ 聚焦中
        </span>
      )}
    </div>
  );
};

export default MessageActions;
