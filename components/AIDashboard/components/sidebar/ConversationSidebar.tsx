import React from 'react';

// 对话类型
interface Conversation {
  id: string;
  title?: string;
  updatedAt: string | Date;
}

// Props - 简化版
interface ConversationSidebarProps {
  // 数据
  conversations: Conversation[];
  loadingConversations: boolean;
  currentConversationId: string | null;
  
  // 搜索/筛选状态
  searchQuery: string;
  sortBy: 'updated' | 'created' | 'name';
  sortOrder: 'asc' | 'desc';
  
  // 编辑状态
  quickRenameId: string | null;
  quickRenameValue: string;
  
  // 回调函数
  onNewChat: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: 'updated' | 'created' | 'name') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onQuickRename: (id: string, name: string) => void;
  onQuickRenameStart: (id: string, currentName: string) => void;
  onQuickRenameCancel: () => void;
  onQuickRenameValueChange: (value: string) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  loadingConversations,
  currentConversationId,
  searchQuery,
  sortBy,
  sortOrder,
  quickRenameId,
  quickRenameValue,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onSearchChange,
  onSortChange,
  onSortOrderChange,
  onQuickRename,
  onQuickRenameStart,
  onQuickRenameCancel,
  onQuickRenameValueChange
}) => {
  return (
    <aside className="w-72 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/20 dark:bg-background-dark/50 shrink-0">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <button 
          onClick={onNewChat}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span> 新对话
        </button>
      </div>

      {/* 搜索和排序 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-500">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="px-2 py-1 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="updated">更新时间</option>
              <option value="created">创建时间</option>
              <option value="name">名称</option>
            </select>
          </div>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={sortOrder === 'asc' ? '升序（点击切换为降序）' : '降序（点击切换为升序）'}
          >
            <span className="material-symbols-outlined text-sm text-gray-500">
              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </button>
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {loadingConversations ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
              <p className="text-xs text-gray-400">加载中...</p>
            </div>
          </div>
        ) : conversations.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">对话列表</span>
              <span className="text-[10px] text-gray-400">{conversations.length} 个对话</span>
            </div>

            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={currentConversationId === conv.id}
                isRenaming={quickRenameId === conv.id}
                renameValue={quickRenameValue}
                onSelect={() => onSelectConversation(conv)}
                onDelete={() => onDeleteConversation(conv.id)}
                onRenameStart={() => onQuickRenameStart(conv.id, conv.title || '')}
                onRenameChange={onQuickRenameValueChange}
                onRenameConfirm={() => onQuickRename(conv.id, quickRenameValue)}
                onRenameCancel={onQuickRenameCancel}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-700">
              search_off
            </span>
            <p className="text-xs text-gray-400 mt-2">没有找到对话</p>
          </div>
        )}
      </div>
    </aside>
  );
};

// 简化版对话项组件
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onDelete: () => void;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation: conv,
  isSelected,
  isRenaming,
  renameValue,
  onSelect,
  onDelete,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel
}) => {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer transition-all group ${
        isSelected
          ? 'bg-primary text-white shadow-md'
          : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
      }`}
    >
      {/* 第一行：标题 + 操作按钮 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameCancel}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') onRenameConfirm();
                if (e.key === 'Escape') onRenameCancel();
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full px-2 py-0.5 text-xs font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded outline-none"
            />
          ) : (
            <h4 
              className={`text-xs font-bold break-words leading-relaxed ${
                isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'
              }`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRenameStart();
              }}
              title="双击快速重命名"
            >
              {conv.title || '未命名对话'}
            </h4>
          )}
        </div>

        {/* 操作按钮 - 只保留修改名称和删除 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart();
            }}
            className={`p-1 rounded transition-colors ${
              isSelected ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="重命名"
          >
            <span className={`material-symbols-outlined text-[12px] ${isSelected ? 'text-white' : 'text-gray-500'}`}>edit</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`p-1 rounded transition-colors ${
              isSelected ? 'hover:bg-red-500/30 text-red-200' : 'hover:bg-red-100 dark:hover:bg-red-900 text-red-500'
            }`}
            title="删除"
          >
            <span className="material-symbols-outlined text-[12px]">delete</span>
          </button>
        </div>
      </div>

      {/* 第二行：时间 */}
      <p className={`text-[10px] mt-1 ${
        isSelected ? 'text-white/60' : 'text-gray-400'
      }`}>
        {new Date(conv.updatedAt).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
  );
};
