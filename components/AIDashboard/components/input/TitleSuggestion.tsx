import React from 'react';

interface TitleSuggestionProps {
  generatedTitle: string | null;
  isGenerating: boolean;
  hasConversation: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * 自动标题建议组件
 * 显示 AI 生成的对话标题建议
 */
export const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  generatedTitle,
  isGenerating,
  hasConversation,
  onApply,
  onDismiss,
}) => {
  if (!generatedTitle || isGenerating || !hasConversation) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="material-symbols-outlined text-sm text-emerald-500">auto_fix_high</span>
      <span className="text-xs text-gray-600 dark:text-gray-300">建议标题:</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{generatedTitle}</span>
      <button
        onClick={onApply}
        className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-xs">check</span>
        应用
      </button>
      <button
        onClick={onDismiss}
        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        title="忽略建议"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
