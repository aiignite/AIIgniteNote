import React from 'react';

interface MultiSelectToolbarProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  onBulkBookmark: () => void;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onExitMultiSelect: () => void;
}

/**
 * 多选操作工具栏组件
 * 显示在消息区域底部，用于批量操作消息
 */
export const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  isVisible,
  selectedCount,
  totalCount,
  onBulkBookmark,
  onBulkExport,
  onBulkDelete,
  onSelectAll,
  onExitMultiSelect,
}) => {
  if (!isVisible || selectedCount === 0) {
    return null;
  }

  const isAllSelected = selectedCount === totalCount;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-4 py-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          已选择 <span className="text-cyan-600 font-bold">{selectedCount}</span> 条消息
        </span>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <button
          onClick={onBulkBookmark}
          className="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors"
          title="切换书签"
        >
          <span className="material-symbols-outlined text-sm">bookmark</span>
        </button>
        <button
          onClick={onBulkExport}
          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
          title="导出选中"
        >
          <span className="material-symbols-outlined text-sm">download</span>
        </button>
        <button
          onClick={onBulkDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="删除选中"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <button
          onClick={onSelectAll}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          title={isAllSelected ? '取消全选' : '全选'}
        >
          <span className="material-symbols-outlined text-sm">
            {isAllSelected ? 'deselect' : 'select_all'}
          </span>
        </button>
        <button
          onClick={onExitMultiSelect}
          className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          title="退出多选"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
};
