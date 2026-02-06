/**
 * ShortcutsPanel - 快捷键帮助面板
 * 显示所有可用的键盘快捷键
 */

import React from 'react';

interface ShortcutItem {
  keys: string[];
  description: string;
  category?: string;
}

interface ShortcutsPanelProps {
  onClose: () => void;
  shortcuts?: ShortcutItem[];
  className?: string;
}

// 默认快捷键列表
const defaultShortcuts: ShortcutItem[] = [
  // 消息操作
  { category: '消息操作', keys: ['Enter'], description: '发送消息' },
  { keys: ['Shift', 'Enter'], description: '换行' },
  { keys: ['⌘/Ctrl', 'Enter'], description: '发送并继续输入' },
  { keys: ['Escape'], description: '清空输入框' },
  
  // 对话管理
  { category: '对话管理', keys: ['⌘/Ctrl', 'N'], description: '新建对话' },
  { keys: ['⌘/Ctrl', 'W'], description: '关闭当前对话' },
  { keys: ['⌘/Ctrl', 'S'], description: '保存对话' },
  { keys: ['⌘/Ctrl', 'E'], description: '导出对话' },
  
  // 导航
  { category: '导航', keys: ['⌘/Ctrl', 'K'], description: '快速搜索' },
  { keys: ['⌘/Ctrl', '↑'], description: '上一条对话' },
  { keys: ['⌘/Ctrl', '↓'], description: '下一条对话' },
  { keys: ['⌘/Ctrl', 'J'], description: '聚焦输入框' },
  
  // 编辑
  { category: '编辑', keys: ['⌘/Ctrl', 'Z'], description: '撤销' },
  { keys: ['⌘/Ctrl', 'Shift', 'Z'], description: '重做' },
  { keys: ['⌘/Ctrl', 'A'], description: '全选' },
  
  // 视图
  { category: '视图', keys: ['⌘/Ctrl', 'B'], description: '切换侧边栏' },
  { keys: ['⌘/Ctrl', ','], description: '打开设置' },
  { keys: ['⌘/Ctrl', '/'], description: '显示快捷键' },
];

// 按类别分组
const groupShortcuts = (shortcuts: ShortcutItem[]) => {
  const groups: Record<string, ShortcutItem[]> = {};
  let currentCategory = '其他';
  
  shortcuts.forEach((item) => {
    if (item.category) {
      currentCategory = item.category;
    }
    if (!groups[currentCategory]) {
      groups[currentCategory] = [];
    }
    groups[currentCategory].push(item);
  });
  
  return groups;
};

// 渲染按键
const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm">
    {keyName}
  </kbd>
);

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({
  onClose,
  shortcuts = defaultShortcuts,
  className = '',
}) => {
  const groups = groupShortcuts(shortcuts);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden max-w-lg ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">keyboard</span>
          <h3 className="font-semibold text-gray-900 dark:text-white">键盘快捷键</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">close</span>
        </button>
      </div>

      {/* 快捷键列表 */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {category}
            </h4>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <KeyBadge keyName={key} />
                        {keyIndex < item.keys.length - 1 && (
                          <span className="text-gray-400 text-xs">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          按 <KeyBadge keyName="⌘/Ctrl" /> + <KeyBadge keyName="/" /> 随时查看快捷键
        </p>
      </div>
    </div>
  );
};

// 快捷键 Hook
export const useKeyboardShortcuts = (
  shortcuts: Array<{
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
  }>
) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default ShortcutsPanel;
