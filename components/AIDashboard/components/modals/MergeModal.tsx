import React from 'react';

interface Conversation {
  id: string;
  title: string;
  messages?: unknown[];
}

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversation: Conversation | null;
  conversations: Conversation[];
  mergeTarget: string | null;
  onSelectTarget: (id: string) => void;
  onMerge: (targetId: string) => void;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  currentConversation,
  conversations,
  mergeTarget,
  onSelectTarget,
  onMerge
}) => {
  if (!isOpen || !currentConversation) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">merge</span>
            合并对话
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            将 "<span className="font-medium">{currentConversation.title}</span>" 合并到：
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {conversations
              .filter(c => c.id !== currentConversation.id)
              .map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onSelectTarget(conv.id)}
                  className={`w-full p-3 text-left rounded-xl transition-colors ${
                    mergeTarget === conv.id
                      ? 'bg-primary/5 dark:bg-primary/10 border-2 border-primary'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{conv.title || '未命名'}</div>
                  <div className="text-xs text-gray-500 mt-1">{conv.messages?.length || 0} 条消息</div>
                </button>
              ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => mergeTarget && onMerge(mergeTarget)}
            disabled={!mergeTarget}
            className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认合并
          </button>
        </div>
      </div>
    </div>
  );
};
