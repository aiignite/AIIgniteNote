import React from 'react';

interface ChatStats {
  total: number;
  user: number;
  ai: number;
  contextUsagePercent: number;
  contextWindowSize: number;
  averageRating: number;
  ratedCount: number;
}

interface CostEstimate {
  totalTokens: number;
  costUSD: number;
}

interface ChatStatsBarProps {
  chatStats: ChatStats;
  bookmarkCount: number;
  showBookmarkedOnly: boolean;
  chatMessages: { id?: string; role: string; text: string }[];
  isGenerating: boolean;
  generationSpeed: number;
  estimatedConversationCost: CostEstimate;
  autoDraftSaved: boolean;
  showChatSearch: boolean;
  chatSearchQuery: string;
  searchMatchCount: number;
  showExportOptions: boolean;
  toolbarCollapsed: boolean;
  compactMessageMode: boolean;
  isMultiSelectMode: boolean;
  bubbleTheme: 'default' | 'minimal' | 'gradient' | 'glass';
  bubbleThemes: readonly { readonly id: string; readonly icon: string; readonly name?: string; readonly description?: string }[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  
  // 回调
  onSearchChange: (query: string) => void;
  onSearchClose: () => void;
  onSearchOpen: () => void;
  onToggleBookmarkFilter: () => void;
  onToggleExportOptions: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  onExportHTML: () => void;
  onToggleToolbar: () => void;
  onToggleCompactMode: () => void;
  onShowShortcutsHelp: () => void;
  onShowConversationStats: () => void;
  onToggleMultiSelect: () => void;
  onChangeBubbleTheme: () => void;
  onShowCostEstimate: () => void;
}

export const ChatStatsBar: React.FC<ChatStatsBarProps> = ({
  chatStats,
  bookmarkCount,
  showBookmarkedOnly,
  chatMessages,
  isGenerating,
  generationSpeed,
  estimatedConversationCost,
  autoDraftSaved,
  showChatSearch,
  chatSearchQuery,
  searchMatchCount,
  showExportOptions,
  toolbarCollapsed,
  compactMessageMode,
  isMultiSelectMode,
  bubbleTheme,
  bubbleThemes,
  searchInputRef,
  onSearchChange,
  onSearchClose,
  onSearchOpen,
  onToggleBookmarkFilter,
  onToggleExportOptions,
  onExportMarkdown,
  onExportJSON,
  onExportHTML,
  onToggleToolbar,
  onToggleCompactMode,
  onShowShortcutsHelp,
  onShowConversationStats,
  onToggleMultiSelect,
  onChangeBubbleTheme,
  onShowCostEstimate
}) => {
  if (!chatStats) return null;

  return (
    <div className="max-w-4xl mx-auto mb-4 sticky top-0 z-10">
      <div className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
        {showChatSearch ? (
          // 搜索模式
          <div className="flex-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-gray-400">search</span>
            <input
              ref={searchInputRef}
              type="text"
              value={chatSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索对话内容..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearchClose();
                }
              }}
            />
            {chatSearchQuery && (
              <span className="text-xs text-gray-400">
                找到 {searchMatchCount} 条结果
              </span>
            )}
            <button
              onClick={onSearchClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ) : (
          // 统计信息模式
          <>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">chat</span>
                <span className="font-medium">{chatStats.total}</span> 条消息
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-blue-500">person</span>
                <span>{chatStats.user}</span> 提问
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-green-500">smart_toy</span>
                <span>{chatStats.ai}</span> 回复
              </span>
              {bookmarkCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-yellow-500">bookmark</span>
                  <span>{bookmarkCount}</span> 书签
                </span>
              )}
              {/* 上下文窗口使用率 */}
              <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-sm text-orange-500">memory</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        chatStats.contextUsagePercent < 50 ? 'bg-green-500' :
                        chatStats.contextUsagePercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${chatStats.contextUsagePercent}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${
                    chatStats.contextUsagePercent < 50 ? 'text-green-600' :
                    chatStats.contextUsagePercent < 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {chatStats.contextUsagePercent.toFixed(0)}%
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  ({(chatStats.contextWindowSize / 1000).toFixed(0)}K)
                </span>
              </div>
              {/* 平均评分显示 */}
              {chatStats.ratedCount > 0 && (
                <div className="hidden lg:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                  <span className="material-symbols-outlined text-sm text-amber-500">star</span>
                  <span className="text-amber-600 font-medium">{chatStats.averageRating.toFixed(1)}</span>
                  <span className="text-gray-400">({chatStats.ratedCount})</span>
                </div>
              )}
              {/* 生成速度指示器 */}
              {isGenerating && generationSpeed > 0 && (
                <div className="hidden lg:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 animate-pulse">
                  <span className="material-symbols-outlined text-sm text-green-500">bolt</span>
                  <span className="text-green-600 font-medium">{generationSpeed}</span>
                  <span className="text-[10px] text-gray-400">tokens/s</span>
                </div>
              )}
              {/* 成本估算 */}
              {estimatedConversationCost.totalTokens > 0 && !isGenerating && (
                <div 
                  className="hidden lg:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80"
                  onClick={onShowCostEstimate}
                  title="对话成本估算"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-500">payments</span>
                  <span className="text-emerald-600 font-medium">${estimatedConversationCost.costUSD.toFixed(4)}</span>
                </div>
              )}
              {/* 草稿自动保存提示 */}
              {autoDraftSaved && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 animate-in fade-in duration-300">
                  <span className="material-symbols-outlined text-sm text-green-500">cloud_done</span>
                  <span className="text-xs text-green-600">已保存</span>
                </div>
              )}
            </div>
            {/* 精简后的工具栏 - 只保留核心功能 */}
            <div className="flex items-center gap-1">
              {/* 搜索 */}
              <button
                onClick={onSearchOpen}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="搜索对话 (Ctrl+F)"
              >
                <span className="material-symbols-outlined text-sm">search</span>
              </button>
              {/* 书签筛选 */}
              {bookmarkCount > 0 && (
                <button
                  onClick={onToggleBookmarkFilter}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showBookmarkedOnly 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' 
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={showBookmarkedOnly ? '显示全部消息' : '只显示书签消息'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {showBookmarkedOnly ? 'bookmark' : 'bookmark_border'}
                  </span>
                </button>
              )}
              {/* 导出 */}
              {chatMessages.length > 0 && (
                <div className="relative">
                  <button
                    onClick={onToggleExportOptions}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showExportOptions
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                        : 'text-gray-400 hover:text-violet-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="导出对话"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                  {showExportOptions && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]">
                      <button
                        onClick={onExportMarkdown}
                        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span>📝</span><span>Markdown</span>
                      </button>
                      <button
                        onClick={onExportJSON}
                        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span>📋</span><span>JSON</span>
                      </button>
                      <button
                        onClick={onExportHTML}
                        className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span>🌐</span><span>HTML</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* 更多操作下拉菜单 */}
              <div className="relative">
                <button
                  onClick={onToggleToolbar}
                  className={`p-1.5 rounded-lg transition-colors ${
                    toolbarCollapsed
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="更多选项"
                >
                  <span className="material-symbols-outlined text-sm">more_horiz</span>
                </button>
                {toolbarCollapsed && (
                  <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[180px]">
                    {/* 紧凑模式 */}
                    <button
                      onClick={onToggleCompactMode}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="material-symbols-outlined text-sm">{compactMessageMode ? 'view_agenda' : 'view_headline'}</span>
                      <span>{compactMessageMode ? '标准视图' : '紧凑视图'}</span>
                    </button>
                    {/* 快捷键帮助 */}
                    <button
                      onClick={onShowShortcutsHelp}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="material-symbols-outlined text-sm">keyboard</span>
                      <span>快捷键帮助</span>
                    </button>
                    {/* 对话统计 */}
                    {chatStats.total > 0 && (
                      <button
                        onClick={onShowConversationStats}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="material-symbols-outlined text-sm">analytics</span>
                        <span>对话统计</span>
                      </button>
                    )}
                    {/* 多选模式 */}
                    <button
                      onClick={onToggleMultiSelect}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="material-symbols-outlined text-sm">{isMultiSelectMode ? 'close' : 'checklist'}</span>
                      <span>{isMultiSelectMode ? '退出多选' : '多选消息'}</span>
                    </button>
                    {/* 分隔线 */}
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    {/* 主题切换 */}
                    <button
                      onClick={onChangeBubbleTheme}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="text-sm">{bubbleThemes.find(t => t.id === bubbleTheme)?.icon}</span>
                      <span>切换气泡主题</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
