import React from 'react';

interface KeyboardShortcutsHintProps {
  voiceSupported: boolean;
}

/**
 * 快捷键提示组件
 * 显示在输入区域下方的快捷键提示
 */
export const KeyboardShortcutsHint: React.FC<KeyboardShortcutsHintProps> = ({
  voiceSupported,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 mt-3">
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Enter</kbd>
        发送
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Shift+Enter</kbd>
        换行
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Esc</kbd>
        停止生成
      </span>
      {voiceSupported && (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">mic</span>
          语音输入
        </span>
      )}
    </div>
  );
};
