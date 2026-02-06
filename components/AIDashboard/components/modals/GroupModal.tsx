import React from 'react';

interface Conversation {
  id: string;
  title: string;
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedConversation: Conversation | null;
  currentConversationGroups: string[];
  messageGroups: Record<string, number[]>;
  onCreateGroup: (groupName: string) => void;
  onDeleteGroup: (groupKey: string) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  selectedConversation,
  currentConversationGroups,
  messageGroups,
  onCreateGroup,
  onDeleteGroup
}) => {
  if (!isOpen || !selectedConversation) return null;

  const handleCreateGroup = (value: string) => {
    if (value.trim()) {
      onCreateGroup(value.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">category</span>
            消息分组
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="新建分组名称..."
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              id="new-group-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  handleCreateGroup(input.value);
                  input.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('new-group-input') as HTMLInputElement;
                if (input?.value) {
                  handleCreateGroup(input.value);
                  input.value = '';
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              创建
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentConversationGroups.length > 0 ? (
              currentConversationGroups.map(groupName => {
                const key = `${selectedConversation.id}-${groupName}`;
                const msgCount = messageGroups[key]?.length || 0;
                return (
                  <div key={groupName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-amber-500">folder</span>
                      <span className="text-sm font-medium">{groupName}</span>
                      <span className="text-xs text-gray-400">({msgCount} 条)</span>
                    </div>
                    <button
                      onClick={() => onDeleteGroup(key)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂无分组，创建一个吧</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
