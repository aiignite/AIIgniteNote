import React from 'react';

interface ResponseTimeoutAlertProps {
  showTimeout: boolean;
  isGenerating: boolean;
  onStop: () => void;
}

/**
 * 响应超时提醒组件
 * 当 AI 响应时间较长时显示警告并提供停止选项
 */
export const ResponseTimeoutAlert: React.FC<ResponseTimeoutAlertProps> = ({
  showTimeout,
  isGenerating,
  onStop,
}) => {
  if (!showTimeout || !isGenerating) {
    return null;
  }

  return (
    <div className="mb-3 pb-3 border-b border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
        <span className="material-symbols-outlined text-amber-500 animate-pulse">hourglass_empty</span>
        <span className="text-xs text-amber-700 dark:text-amber-400">
          响应时间较长，可能是网络问题或模型繁忙
        </span>
        <button
          onClick={onStop}
          className="ml-auto px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
        >
          停止
        </button>
      </div>
    </div>
  );
};
