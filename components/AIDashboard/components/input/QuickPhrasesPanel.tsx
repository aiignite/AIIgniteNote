import React from 'react';

interface QuickPhrase {
  id: string;
  icon: string;
  text: string;
}

interface QuickPhrasesPanelProps {
  show: boolean;
  phrases: QuickPhrase[];
  onSelectPhrase: (text: string) => void;
  onClose: () => void;
}

/**
 * 快捷短语面板组件
 * 显示可快速插入的常用短语
 */
export const QuickPhrasesPanel: React.FC<QuickPhrasesPanelProps> = ({
  show,
  phrases,
  onSelectPhrase,
  onClose,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">⚡ 快捷短语</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <span className="material-symbols-outlined text-sm text-gray-400">close</span>
        </button>
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5">
        {phrases.map(phrase => (
          <button
            key={phrase.id}
            onClick={() => onSelectPhrase(phrase.text)}
            className="p-2 text-left text-sm bg-gray-50 dark:bg-gray-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg">{phrase.icon}</span>
            <span className="text-gray-700 dark:text-gray-300 truncate">{phrase.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
