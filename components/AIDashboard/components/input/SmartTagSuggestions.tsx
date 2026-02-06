import React from 'react';

interface SmartTagSuggestionsProps {
  suggestions: string[];
  hasConversation: boolean;
  isGenerating: boolean;
  onAddTag: (tag: string) => void;
  onDismiss: () => void;
}

/**
 * 智能标签建议组件
 * 显示 AI 生成的对话标签建议
 */
export const SmartTagSuggestions: React.FC<SmartTagSuggestionsProps> = ({
  suggestions,
  hasConversation,
  isGenerating,
  onAddTag,
  onDismiss,
}) => {
  if (suggestions.length === 0 || !hasConversation || isGenerating) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="material-symbols-outlined text-sm text-teal-500">sell</span>
      <span className="text-xs text-gray-500">建议标签:</span>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((tag) => (
          <button
            key={tag}
            onClick={() => onAddTag(tag)}
            className="px-2 py-0.5 text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1"
          >
            <span>#{tag}</span>
            <span className="material-symbols-outlined text-xs">add</span>
          </button>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto p-0.5 text-gray-400 hover:text-gray-600 rounded"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
