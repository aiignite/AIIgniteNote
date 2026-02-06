import React, { RefObject } from 'react';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  isGenerating: boolean;
  hasMessages: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onSelectSuggestion: (question: string) => void;
  onDismiss: () => void;
}

/**
 * 智能跟进问题建议组件
 * 显示 AI 生成的跟进问题建议
 */
export const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({
  suggestions,
  isGenerating,
  hasMessages,
  textareaRef,
  onSelectSuggestion,
  onDismiss,
}) => {
  if (suggestions.length === 0 || isGenerating || !hasMessages) {
    return null;
  }

  return (
    <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-sm text-indigo-500">lightbulb</span>
        <span className="text-xs text-gray-500">智能建议</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSelectSuggestion(question);
              textareaRef.current?.focus();
            }}
            className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {question}
          </button>
        ))}
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="关闭建议"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
};
