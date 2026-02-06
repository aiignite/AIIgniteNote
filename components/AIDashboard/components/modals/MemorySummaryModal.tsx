import React from 'react';

interface MemorySummary {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  topics: string[];
  codeBlockCount: number;
  linkCount: number;
  firstMessageTime?: string | Date;
  lastMessageTime?: string | Date;
}

interface MemorySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorySummary: MemorySummary | null;
}

export const MemorySummaryModal: React.FC<MemorySummaryModalProps> = ({
  isOpen,
  onClose,
  memorySummary
}) => {
  if (!isOpen || !memorySummary) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">psychology</span>
            对话记忆摘要
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* 消息统计 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">analytics</span>
              对话统计
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{memorySummary.totalMessages}</div>
                <div className="text-xs text-gray-500">总消息</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{memorySummary.userMessages}</div>
                <div className="text-xs text-gray-500">用户消息</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{memorySummary.aiMessages}</div>
                <div className="text-xs text-gray-500">AI 回复</div>
              </div>
            </div>
          </div>

          {/* 检测到的主题 */}
          {memorySummary.topics.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">topic</span>
                检测到的主题
              </h4>
              <div className="flex flex-wrap gap-2">
                {memorySummary.topics.map((topic, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 内容特征 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-2xl text-orange-500 mb-1">code</span>
              <div className="text-xl font-bold">{memorySummary.codeBlockCount}</div>
              <div className="text-xs text-gray-500">代码块</div>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-2xl text-cyan-500 mb-1">link</span>
              <div className="text-xl font-bold">{memorySummary.linkCount}</div>
              <div className="text-xs text-gray-500">链接</div>
            </div>
          </div>

          {/* 时间范围 */}
          {memorySummary.firstMessageTime && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">schedule</span>
                时间范围
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>开始时间</span>
                  <span>{new Date(memorySummary.firstMessageTime).toLocaleString('zh-CN')}</span>
                </div>
                {memorySummary.lastMessageTime && (
                  <div className="flex justify-between mt-1">
                    <span>最后活跃</span>
                    <span>{new Date(memorySummary.lastMessageTime).toLocaleString('zh-CN')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
