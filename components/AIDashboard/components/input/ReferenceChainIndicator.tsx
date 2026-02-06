import React from 'react';

interface ReferenceChainIndicatorProps {
  chainLength: number;
  onClear: () => void;
}

/**
 * 引用链指示器组件
 * 显示当前消息的引用链长度
 */
export const ReferenceChainIndicator: React.FC<ReferenceChainIndicatorProps> = ({
  chainLength,
  onClear
}) => {
  if (chainLength === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
      <span className="material-symbols-outlined text-sm text-indigo-500">link</span>
      <span className="text-xs text-indigo-600 dark:text-indigo-400">{chainLength} 条引用</span>
      <button
        onClick={onClear}
        className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded"
      >
        <span className="material-symbols-outlined text-xs text-indigo-400">close</span>
      </button>
    </div>
  );
};
