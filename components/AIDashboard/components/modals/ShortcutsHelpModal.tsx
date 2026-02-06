import React from 'react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">keyboard</span>
            键盘快捷键
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* 通用快捷键 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">apps</span>
              通用
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">显示/隐藏快捷键帮助</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Ctrl + /</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">关闭当前弹窗</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Esc</kbd>
              </div>
            </div>
          </div>

          {/* 对话管理 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">chat</span>
              对话管理
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">新建对话</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">聚焦搜索框</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">/</kbd>
              </div>
            </div>
          </div>

          {/* 消息操作 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">message</span>
              消息操作
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">切换多选模式</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">滚动到底部</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">B</kbd>
              </div>
            </div>
          </div>

          {/* 输入快捷键 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">edit</span>
              输入区域
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">发送消息</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">换行</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Shift + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">粘贴图片</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Ctrl + V</kbd>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            💡 快捷键仅在非输入状态下生效
          </p>
        </div>
      </div>
    </div>
  );
};
