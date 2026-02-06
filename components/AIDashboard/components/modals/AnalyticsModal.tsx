import React from 'react';

interface ChatStats {
  total: number;
  user: number;
  ai: number;
  totalChars?: number;
  aiChars?: number;
  estimatedTokens: number;
  contextWindowSize?: number;
  contextUsagePercent?: number;
  ratedCount: number;
  averageRating: number;
  pinnedCount?: number;
}

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatStats: ChatStats | null;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  chatStats
}) => {
  if (!isOpen || !chatStats) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">analytics</span>
            对话分析
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 概览统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <span className="material-symbols-outlined text-sm">chat</span>
                <span className="text-xs font-medium">总消息数</span>
              </div>
              <div className="text-2xl font-bold">{chatStats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                <span className="text-xs font-medium">AI 回复</span>
              </div>
              <div className="text-2xl font-bold">{chatStats.ai}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                <span className="material-symbols-outlined text-sm">token</span>
                <span className="text-xs font-medium">估算 Token</span>
              </div>
              <div className="text-2xl font-bold">{(chatStats.estimatedTokens / 1000).toFixed(1)}K</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                <span className="material-symbols-outlined text-sm">star</span>
                <span className="text-xs font-medium">平均评分</span>
              </div>
              <div className="text-2xl font-bold">{chatStats.ratedCount > 0 ? chatStats.averageRating.toFixed(1) : '-'}</div>
            </div>
          </div>

          {/* 消息分布图 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">pie_chart</span>
              消息分布
            </h4>
            <div className="flex items-center gap-8">
              {/* 简易饼图 */}
              <div className="relative size-32">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="20" className="text-gray-200 dark:text-gray-600" />
                  <circle 
                    cx="50" cy="50" r="40" fill="none" 
                    stroke="#3B82F6" strokeWidth="20"
                    strokeDasharray={`${(chatStats.user / chatStats.total) * 251.2} 251.2`}
                    className="transition-all duration-500"
                  />
                  <circle 
                    cx="50" cy="50" r="40" fill="none" 
                    stroke="#10B981" strokeWidth="20"
                    strokeDasharray={`${(chatStats.ai / chatStats.total) * 251.2} 251.2`}
                    strokeDashoffset={`-${(chatStats.user / chatStats.total) * 251.2}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{chatStats.total}</span>
                </div>
              </div>
              {/* 图例 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-sm">用户消息</span>
                  <span className="text-sm font-medium">{chatStats.user}</span>
                  <span className="text-xs text-gray-400">({((chatStats.user / chatStats.total) * 100).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-sm">AI 回复</span>
                  <span className="text-sm font-medium">{chatStats.ai}</span>
                  <span className="text-xs text-gray-400">({((chatStats.ai / chatStats.total) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 详细指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">消息长度</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">总字符数</span>
                  <span className="text-sm font-medium">{chatStats.totalChars?.toLocaleString() || '-'} 字符</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">评分统计</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">已评分消息</span>
                  <span className="text-sm font-medium">{chatStats.ratedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">平均评分</span>
                  <span className="text-sm font-medium">{chatStats.ratedCount > 0 ? chatStats.averageRating.toFixed(1) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
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
