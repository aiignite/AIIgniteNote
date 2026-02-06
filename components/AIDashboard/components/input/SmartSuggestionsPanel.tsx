import React from 'react';

interface SmartSuggestionsPanelProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onClear: () => void;
}

/**
 * 智能建议面板组件
 * Phase 27: 显示基于用户输入的智能建议
 */
export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  suggestions,
  onSelectSuggestion,
  onClear
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md z-20">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => {
            onSelectSuggestion(suggestion);
            onClear();
          }}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <span className="material-symbols-outlined text-sm text-gray-400">auto_awesome</span>
          <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
        </button>
      ))}
    </div>
  );
};
