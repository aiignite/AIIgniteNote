import React from 'react';

interface QuickActionsMenuProps {
  show: boolean;
  hasConversation: boolean;
  hasMessages: boolean;
  lastMessageIsModel: boolean;
  onToggle: () => void;
  onShowQuickPhrases: () => void;
  onShowTemplates: () => void;
  onGenerateSummary: () => void;
  onGenerateContinuations: () => void;
  onShowShortcuts: () => void;
}

/**
 * 更多工具/快捷操作菜单组件
 */
export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  show,
  hasConversation,
  hasMessages,
  lastMessageIsModel,
  onToggle,
  onShowQuickPhrases,
  onShowTemplates,
  onGenerateSummary,
  onGenerateContinuations,
  onShowShortcuts,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`p-2 rounded-xl transition-all ${
          show
            ? 'text-primary bg-primary/10'
            : 'text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="更多工具"
      >
        <span className="material-symbols-outlined">add_circle</span>
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500">快捷操作</span>
          </div>
          <button
            onClick={onShowQuickPhrases}
            className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="material-symbols-outlined text-sm text-gray-400">bolt</span>
            快捷短语
          </button>
          <button
            onClick={onShowTemplates}
            className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="material-symbols-outlined text-sm text-gray-400">description</span>
            输入模板
          </button>
          <button
            onClick={onGenerateSummary}
            className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            disabled={!hasConversation}
          >
            <span className="material-symbols-outlined text-sm text-gray-400">summarize</span>
            对话摘要
          </button>
          <button
            onClick={onGenerateContinuations}
            className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            disabled={!hasMessages || !lastMessageIsModel}
          >
            <span className="material-symbols-outlined text-sm text-gray-400">auto_fix_high</span>
            智能续写
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={onShowShortcuts}
            className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-xl"
          >
            <span className="material-symbols-outlined text-sm text-gray-400">keyboard</span>
            快捷键帮助
          </button>
        </div>
      )}
    </div>
  );
};
