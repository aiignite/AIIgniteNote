import React from 'react';

interface MessageStatsData {
  totalMessages: number;
  totalChars: number;
  userMessages: number;
  aiMessages: number;
  avgUserLen: number;
  avgAiLen: number;
  codeBlockCount: number;
  questionCount: number;
  ratio: string;
}

interface MessageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: MessageStatsData | null;
}

export const MessageStatsModal: React.FC<MessageStatsModalProps> = ({
  isOpen,
  onClose,
  stats
}) => {
  if (!isOpen || !stats) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">bar_chart</span>
            消息统计
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMessages}</div>
              <div className="text-xs text-gray-500">总消息数</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalChars}</div>
              <div className="text-xs text-gray-500">总字符数</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.userMessages}</div>
              <div className="text-xs text-gray-500">用户消息</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.aiMessages}</div>
              <div className="text-xs text-gray-500">AI 回复</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">用户平均消息长度</span>
              <span className="font-medium">{stats.avgUserLen} 字符</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">AI 平均回复长度</span>
              <span className="font-medium">{stats.avgAiLen} 字符</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">代码块数量</span>
              <span className="font-medium">{stats.codeBlockCount} 个</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">提问数量</span>
              <span className="font-medium">{stats.questionCount} 个</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">问答比例</span>
              <span className="font-medium">{stats.ratio}:1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
