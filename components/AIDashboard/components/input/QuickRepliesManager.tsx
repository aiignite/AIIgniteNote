import React from 'react';

interface QuickRepliesManagerProps {
  showInputEmpty: boolean;
  isGenerating: boolean;
  hasMessages: boolean;
  quickReplies: string[];
  showQuickRepliesPanel: boolean;
  onQuickReply: (reply: string) => void;
  onRemoveReply: (reply: string) => void;
  onAddReply: (reply: string) => void;
  onTogglePanel: () => void;
}

/**
 * 快捷回复管理器组件
 * Phase 14: 可自定义快捷回复
 */
export const QuickRepliesManager: React.FC<QuickRepliesManagerProps> = ({
  showInputEmpty,
  isGenerating,
  hasMessages,
  quickReplies,
  showQuickRepliesPanel,
  onQuickReply,
  onRemoveReply,
  onAddReply,
  onTogglePanel
}) => {
  if (!showInputEmpty || isGenerating || !hasMessages) {
    return null;
  }

  const handleAddReply = (input: HTMLInputElement) => {
    if (input.value.trim()) {
      onAddReply(input.value.trim());
      input.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-1 pb-1 border-b border-gray-100 dark:border-gray-700">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">bolt</span>
        快捷:
      </span>
      {quickReplies.slice(0, 6).map((reply) => (
        <button
          key={reply}
          onClick={() => onQuickReply(reply)}
          className="group relative px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-primary/20 hover:text-primary rounded-lg transition-colors"
        >
          {reply}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveReply(reply);
            }}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            ×
          </button>
        </button>
      ))}
      {/* 添加快捷回复按钮 */}
      <div className="relative">
        <button
          onClick={onTogglePanel}
          className="p-1 text-gray-400 hover:text-primary transition-colors"
          title="管理快捷回复"
        >
          <span className="material-symbols-outlined text-sm">
            {showQuickRepliesPanel ? 'close' : 'add_circle'}
          </span>
        </button>
        {showQuickRepliesPanel && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-20">
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">添加快捷回复</h5>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入快捷回复..."
                className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddReply(e.target as HTMLInputElement);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                  handleAddReply(input);
                }}
                className="px-2 py-1 text-xs bg-primary text-white rounded-lg"
              >
                添加
              </button>
            </div>
            {quickReplies.length > 6 && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-[10px] text-gray-400">更多 ({quickReplies.length - 6}):</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {quickReplies.slice(6).map(r => (
                    <span 
                      key={r} 
                      className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 rounded cursor-pointer hover:bg-primary/20"
                      onClick={() => onQuickReply(r)}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
