import React from 'react';

// 使用泛型支持任意助手类型
interface AssistantSwitcherModalProps<T extends { id: string; name: string; avatar?: string; model?: string }> {
  isOpen: boolean;
  onClose: () => void;
  assistants: T[];
  currentAssistant: T | null;
  favoriteAssistants: string[];
  onSelectAssistant: (assistant: T) => void;
  onToggleFavorite: (assistantId: string) => void;
}

export const AssistantSwitcherModal = <T extends { id: string; name: string; avatar?: string; model?: string }>({
  isOpen,
  onClose,
  assistants,
  currentAssistant,
  favoriteAssistants,
  onSelectAssistant,
  onToggleFavorite
}: AssistantSwitcherModalProps<T>) => {
  if (!isOpen) return null;

  const favoriteAssistantList = assistants.filter(a => favoriteAssistants.includes(a.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500">smart_toy</span>
            快速切换助手
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* 收藏的助手 */}
          {favoriteAssistantList.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-amber-500">star</span>
                收藏的助手
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {favoriteAssistantList.map(assistant => (
                  <button
                    key={assistant.id}
                    onClick={() => {
                      onSelectAssistant(assistant);
                      onClose();
                    }}
                    className={`p-3 rounded-xl text-left transition-all hover:shadow-md ${
                      currentAssistant?.id === assistant.id
                        ? 'bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{assistant.avatar || '🤖'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{assistant.name}</div>
                        <div className="text-xs text-gray-500 truncate">{assistant.model}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 所有助手 */}
          <h4 className="text-sm font-medium text-gray-500 mb-2">全部助手</h4>
          <div className="space-y-2">
            {assistants.map(assistant => (
              <div 
                key={assistant.id}
                className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                  currentAssistant?.id === assistant.id
                    ? 'bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{assistant.avatar || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{assistant.name}</div>
                  <div className="text-xs text-gray-500">{assistant.model}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleFavorite(assistant.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      favoriteAssistants.includes(assistant.id)
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                        : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    title={favoriteAssistants.includes(assistant.id) ? '取消收藏' : '收藏'}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {favoriteAssistants.includes(assistant.id) ? 'star' : 'star_border'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectAssistant(assistant);
                      onClose();
                    }}
                    className="px-3 py-1 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    使用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            💡 点击星标收藏常用助手，方便快速切换
          </p>
        </div>
      </div>
    </div>
  );
};
