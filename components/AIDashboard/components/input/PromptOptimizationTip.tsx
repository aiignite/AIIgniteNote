import React from 'react';

interface PromptOptimizationTipProps {
  tip: string | null;
  isGenerating: boolean;
  onDismiss: () => void;
}

/**
 * 提问优化建议提示组件
 * Phase 20: 显示提问优化建议
 */
export const PromptOptimizationTip: React.FC<PromptOptimizationTipProps> = ({
  tip,
  isGenerating,
  onDismiss
}) => {
  if (!tip || isGenerating) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-amber-500 text-sm">{tip}</span>
      <button
        onClick={onDismiss}
        className="ml-auto p-0.5 text-amber-400 hover:text-amber-600 rounded"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
