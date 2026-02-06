import React from 'react';

interface ContinuationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}

export const ContinuationPanel: React.FC<ContinuationPanelProps> = ({
  isOpen,
  onClose,
  suggestions,
  onSelectSuggestion
}) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-32 right-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 z-40 animate-in slide-in-from-right-4 duration-300">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-500 text-sm">auto_fix_high</span>
          续写建议
        </h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <div className="p-2 max-h-60 overflow-y-auto">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelectSuggestion(suggestion)}
            className="w-full p-2.5 text-left text-sm rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
          >
            <span className="text-emerald-500">→</span>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};
