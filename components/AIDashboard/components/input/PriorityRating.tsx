import React from 'react';

interface PriorityRatingProps {
  hasConversation: boolean;
  hasEnoughMessages: boolean;
  isGenerating: boolean;
  currentPriority: number;
  onSetPriority: (level: number) => void;
  onClearPriority: () => void;
}

/**
 * 对话优先级评分组件
 * 允许用户为对话设置优先级星级
 */
export const PriorityRating: React.FC<PriorityRatingProps> = ({
  hasConversation,
  hasEnoughMessages,
  isGenerating,
  currentPriority,
  onSetPriority,
  onClearPriority,
}) => {
  if (!hasConversation || !hasEnoughMessages || isGenerating) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 mb-2">
      <span className="text-xs text-gray-400">优先级:</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            onClick={() => onSetPriority(level)}
            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
              currentPriority >= level
                ? 'text-amber-500 scale-110'
                : 'text-gray-300 hover:text-amber-300'
            }`}
            title={`设置优先级 ${level}`}
          >
            <span className="material-symbols-outlined text-sm">
              {currentPriority >= level ? 'star' : 'star_border'}
            </span>
          </button>
        ))}
      </div>
      {currentPriority > 0 && (
        <button
          onClick={onClearPriority}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        >
          清除
        </button>
      )}
    </div>
  );
};
