import React from 'react';

interface ModelInfo {
  color: string;
  icon: string;
  provider: string;
  description: string;
}

interface ConversationStats {
  messageCount: number;
  totalTokens: number;
  costUSD: number;
}

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelInfo: ModelInfo | null;
  modelName: string;
  conversationStats: ConversationStats;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({
  isOpen,
  onClose,
  modelInfo,
  modelName,
  conversationStats
}) => {
  if (!isOpen || !modelInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-br from-${modelInfo.color}-500 to-${modelInfo.color}-600 text-white`}>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{modelInfo.icon}</div>
            <div>
              <h3 className="text-lg font-bold">{modelName}</h3>
              <p className="text-sm opacity-90">{modelInfo.provider}</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">模型描述</h4>
            <p className="text-sm text-gray-800 dark:text-gray-200">{modelInfo.description}</p>
          </div>
          
          {/* 模型能力指标（示意） */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">能力指标</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">推理能力</span>
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">创意写作</span>
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">代码生成</span>
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">响应速度</span>
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 本次对话统计 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{conversationStats.messageCount}</div>
              <div className="text-xs text-gray-500">消息数</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-600">{conversationStats.totalTokens.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Tokens</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-purple-600">${conversationStats.costUSD.toFixed(4)}</div>
              <div className="text-xs text-gray-500">费用</div>
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
