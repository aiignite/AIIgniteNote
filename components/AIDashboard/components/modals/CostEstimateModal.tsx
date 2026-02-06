import React from 'react';

interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
}

interface CostEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  costEstimate: CostEstimate;
}

export const CostEstimateModal: React.FC<CostEstimateModalProps> = ({
  isOpen,
  onClose,
  costEstimate
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
            <span className="material-symbols-outlined text-green-500">payments</span>
            对话费用估算
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Token 统计 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">token</span>
              Token 使用量
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{costEstimate.inputTokens.toLocaleString()}</div>
                <div className="text-xs text-gray-500">输入 Tokens</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{costEstimate.outputTokens.toLocaleString()}</div>
                <div className="text-xs text-gray-500">输出 Tokens</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{costEstimate.totalTokens.toLocaleString()}</div>
                <div className="text-xs text-gray-500">总计 Tokens</div>
              </div>
            </div>
          </div>

          {/* 费用估算 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">attach_money</span>
              预估费用
            </h4>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                ${costEstimate.costUSD.toFixed(4)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ≈ ¥{(costEstimate.costUSD * 7.2).toFixed(4)} CNY
              </div>
            </div>
          </div>

          {/* 定价参考 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">price_check</span>
              定价参考（每 1K tokens）
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">GPT-3.5-Turbo</span>
                <span className="font-medium">输入: $0.0005 / 输出: $0.0015</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">GPT-4</span>
                <span className="font-medium">输入: $0.03 / 输出: $0.06</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Claude 3 Sonnet</span>
                <span className="font-medium">输入: $0.003 / 输出: $0.015</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💡 实际费用可能因模型和提供商不同而有所差异
          </p>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
