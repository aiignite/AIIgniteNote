import React from 'react';

interface SendButtonProps {
  isGenerating: boolean;
  disabled: boolean;
  onSend: () => void;
  onStop: () => void;
}

/**
 * 发送/停止按钮组件
 * 根据生成状态显示发送或停止按钮
 */
export const SendButton: React.FC<SendButtonProps> = ({
  isGenerating,
  disabled,
  onSend,
  onStop
}) => {
  if (isGenerating) {
    return (
      <button
        onClick={onStop}
        className="px-3 h-8 bg-red-500 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 hover:bg-red-600 transition-all shadow-md shadow-red-500/20 animate-pulse"
      >
        <span className="material-symbols-outlined text-base">stop_circle</span>
        停止
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      disabled={disabled}
      className="px-3 h-8 bg-primary text-white rounded-lg font-medium text-xs flex items-center gap-1.5 hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
    >
      <span className="material-symbols-outlined text-base">send</span>
      发送
    </button>
  );
};
