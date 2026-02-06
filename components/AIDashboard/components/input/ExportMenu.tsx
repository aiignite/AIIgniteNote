import React from 'react';

type ExportFormat = 'markdown' | 'json' | 'txt' | 'html';

interface ExportMenuProps {
  showMenu: boolean;
  hasMessages: boolean;
  onToggleMenu: () => void;
  onExport: (format: ExportFormat) => void;
}

const exportFormats: { format: ExportFormat; icon: string; label: string; desc: string }[] = [
  { format: 'markdown', icon: 'description', label: 'Markdown (.md)', desc: '适合阅读和编辑' },
  { format: 'json', icon: 'data_object', label: 'JSON (.json)', desc: '完整数据，可导入' },
  { format: 'txt', icon: 'text_snippet', label: '纯文本 (.txt)', desc: '简洁无格式' },
  { format: 'html', icon: 'html', label: 'HTML (.html)', desc: '可直接在浏览器查看' },
];

/**
 * 导出菜单组件
 * 提供多种格式导出对话的选项
 */
export const ExportMenu: React.FC<ExportMenuProps> = ({
  showMenu,
  hasMessages,
  onToggleMenu,
  onExport,
}) => {
  if (!hasMessages) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={onToggleMenu}
        className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg text-xs transition-all"
        title="导出对话"
      >
        <span className="material-symbols-outlined text-sm">download</span>
        <span className="hidden sm:inline">导出</span>
        <span className="material-symbols-outlined text-xs">expand_more</span>
      </button>
      {/* 导出格式菜单 */}
      {showMenu && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500">选择导出格式</span>
          </div>
          {exportFormats.map(({ format, icon, label, desc }) => (
            <button
              key={format}
              onClick={() => onExport(format)}
              className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-sm text-primary mt-0.5">{icon}</span>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
