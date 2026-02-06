import React from 'react';

interface Snapshot {
  id: string;
  name: string;
  timestamp: string | number;
  conversationId?: string;
  messages: Array<{
    text: string;
    tokenCount?: number;
  }>;
}

interface SnapshotsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({
  isOpen,
  onClose,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot
}) => {
  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    const name = prompt('输入快照名称:');
    if (name) onCreateSnapshot(name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">photo_library</span>
            对话快照
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateSnapshot}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              新建快照
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2">photo_camera</span>
              <p className="text-sm">暂无快照</p>
              <p className="text-xs mt-1">点击"新建快照"保存当前对话状态</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map(snapshot => (
                <div 
                  key={snapshot.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{snapshot.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRestoreSnapshot(snapshot.id)}
                        className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="恢复此快照"
                      >
                        <span className="material-symbols-outlined text-sm">restore</span>
                      </button>
                      <button
                        onClick={() => onDeleteSnapshot(snapshot.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="删除此快照"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">chat</span>
                      {snapshot.messages.length} 条消息
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">token</span>
                      {snapshot.messages.reduce((sum, m) => sum + (m.tokenCount || Math.round(m.text.length * 0.7)), 0).toLocaleString()} tokens
                    </span>
                  </div>
                  {/* 预览最后一条消息 */}
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {snapshot.messages[snapshot.messages.length - 1]?.text.slice(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            💡 快照可以保存对话的当前状态，方便随时恢复
          </p>
        </div>
      </div>
    </div>
  );
};
