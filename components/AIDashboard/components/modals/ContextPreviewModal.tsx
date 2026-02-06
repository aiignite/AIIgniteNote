import React from 'react';

interface ContextInfo {
  usagePercent: number;
  messageCount: number;
  estimatedTokens: number;
  totalChars: number;
  avgMessageLength: number;
}

interface ContextPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextInfo: ContextInfo | null;
}

export const ContextPreviewModal: React.FC<ContextPreviewModalProps> = ({
  isOpen,
  onClose,
  contextInfo
}) => {
  if (!isOpen || !contextInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500">memory</span>
            上下文信息
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* 使用率进度条 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">上下文使用率</span>
              <span className={`text-sm font-medium ${
                contextInfo.usagePercent < 50 ? 'text-green-600' :
                contextInfo.usagePercent < 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {contextInfo.usagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  contextInfo.usagePercent < 50 ? 'bg-green-500' :
                  contextInfo.usagePercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${contextInfo.usagePercent}%` }}
              />
            </div>
          </div>
          
          {/* 详细统计 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{contextInfo.messageCount}</div>
              <div className="text-xs text-gray-500">消息数</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{(contextInfo.estimatedTokens / 1000).toFixed(1)}K</div>
              <div className="text-xs text-gray-500">估算 Token</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{(contextInfo.totalChars / 1000).toFixed(1)}K</div>
              <div className="text-xs text-gray-500">总字符</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{contextInfo.avgMessageLength}</div>
              <div className="text-xs text-gray-500">平均长度</div>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 text-center mt-2">
            💡 当使用率超过 80% 时建议开始新对话
          </p>
        </div>
      </div>
    </div>
  );
};
