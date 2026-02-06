import React from 'react';

interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokens: number;
  conversationDuration: string;
  estimatedUserTokens: number;
  estimatedAssistantTokens: number;
}

interface ConversationStatsPanelProps {
  show: boolean;
  stats: ConversationStats | null;
  onClose: () => void;
}

/**
 * 对话统计面板组件
 * 显示当前对话的统计信息
 */
export const ConversationStatsPanel: React.FC<ConversationStatsPanelProps> = ({
  show,
  stats,
  onClose,
}) => {
  if (!show || !stats) {
    return null;
  }

  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-100 dark:border-cyan-800 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-500">query_stats</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">对话统计</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-cyan-600">{stats.totalMessages}</div>
          <div className="text-xs text-gray-500">总消息</div>
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{stats.userMessages}</div>
          <div className="text-xs text-gray-500">用户消息</div>
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.assistantMessages}</div>
          <div className="text-xs text-gray-500">AI 回复</div>
        </div>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-purple-600">{stats.totalTokens}</div>
          <div className="text-xs text-gray-500">估算 Token</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>⏱️ 对话时长: {stats.conversationDuration}</span>
        <span>📊 输入: {stats.estimatedUserTokens} / 输出: {stats.estimatedAssistantTokens}</span>
      </div>
    </div>
  );
};
