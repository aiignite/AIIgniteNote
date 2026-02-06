import React from 'react';

interface SlashCommand {
  command: string;
  icon: string;
  description: string;
  action: () => void;
}

interface SlashCommandPanelProps {
  show: boolean;
  commands: SlashCommand[];
  onSelectCommand: (cmd: SlashCommand) => void;
}

/**
 * 斜杠命令面板组件
 * 显示可用的快捷命令列表
 */
export const SlashCommandPanel: React.FC<SlashCommandPanelProps> = ({
  show,
  commands,
  onSelectCommand,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-violet-500">terminal</span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">快捷命令</span>
        <span className="text-xs text-gray-400 ml-auto">输入命令名称过滤</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {commands.map((cmd, idx) => (
          <button
            key={cmd.command}
            onClick={() => onSelectCommand(cmd)}
            className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${
              idx === 0 ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''
            }`}
          >
            <span className="material-symbols-outlined text-sm text-violet-500">{cmd.icon}</span>
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{cmd.command}</span>
            <span className="text-xs text-gray-500">{cmd.description}</span>
          </button>
        ))}
        {commands.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-gray-400">
            没有匹配的命令
          </div>
        )}
      </div>
    </div>
  );
};
