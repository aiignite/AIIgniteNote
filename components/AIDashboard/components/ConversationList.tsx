/**
 * ConversationList - 对话列表组件
 * 显示历史对话列表，支持搜索、筛选、排序
 */

import React, { useState, useMemo, useCallback } from 'react';
import { AIConversation, ConversationSortMode } from '../types';

interface ConversationListProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  
  // 可选功能
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortMode?: ConversationSortMode;
  onSortChange?: (mode: ConversationSortMode) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  
  // 标签筛选
  selectedTag?: string | null;
  onTagSelect?: (tag: string | null) => void;
  allTags?: string[];
  
  // 样式
  className?: string;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onRenameConversation,
  searchQuery = '',
  onSearchChange,
  sortMode = 'time',
  onSortChange,
  showArchived = false,
  onToggleArchived,
  selectedTag = null,
  onTagSelect,
  allTags = [],
  className = '',
  loading = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 过滤对话
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        conv.messages?.some(m => m.text.toLowerCase().includes(query))
      );
    }
    
    // 标签过滤
    if (selectedTag) {
      filtered = filtered.filter(conv => 
        conv.tags?.includes(selectedTag)
      );
    }
    
    // 归档过滤
    if (!showArchived) {
      filtered = filtered.filter(conv => !conv.isArchived);
    }
    
    // 排序
    switch (sortMode) {
      case 'time':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'starred':
        filtered.sort((a, b) => {
          if (a.isStarred && !b.isStarred) return -1;
          if (!a.isStarred && b.isStarred) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        break;
    }
    
    return filtered;
  }, [conversations, searchQuery, selectedTag, showArchived, sortMode]);

  // 按日期分组
  const groupedConversations = useMemo(() => {
    const groups: Record<string, AIConversation[]> = {
      '今天': [],
      '昨天': [],
      '本周': [],
      '本月': [],
      '更早': [],
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    filteredConversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      
      if (convDate >= today) {
        groups['今天'].push(conv);
      } else if (convDate >= yesterday) {
        groups['昨天'].push(conv);
      } else if (convDate >= weekStart) {
        groups['本周'].push(conv);
      } else if (convDate >= monthStart) {
        groups['本月'].push(conv);
      } else {
        groups['更早'].push(conv);
      }
    });
    
    return groups;
  }, [filteredConversations]);

  // 开始编辑标题
  const startEditing = useCallback((id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  }, []);

  // 保存编辑
  const saveEditing = useCallback(() => {
    if (editingId && editingTitle.trim() && onRenameConversation) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingId, editingTitle, onRenameConversation]);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);

  // 切换文件夹展开
  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  }, []);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 头部：新建对话按钮 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          新建对话
        </button>
      </div>

      {/* 搜索栏 */}
      {onSearchChange && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索对话..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 工具栏：排序、筛选 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        {/* 排序按钮 */}
        {onSortChange && (
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              {sortMode === 'time' && '时间'}
              {sortMode === 'name' && '名称'}
              {sortMode === 'starred' && '星标'}
            </button>
            
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                {(['time', 'name', 'starred'] as ConversationSortMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      onSortChange(mode);
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortMode === mode ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {mode === 'time' && <><span className="material-symbols-outlined text-sm">schedule</span>时间</>}
                    {mode === 'name' && <><span className="material-symbols-outlined text-sm">sort_by_alpha</span>名称</>}
                    {mode === 'starred' && <><span className="material-symbols-outlined text-sm">star</span>星标</>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 归档切换 */}
        {onToggleArchived && (
          <button
            onClick={onToggleArchived}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showArchived 
                ? 'text-primary bg-primary/10' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">archive</span>
            归档
          </button>
        )}

        <span className="text-xs text-gray-400">
          {filteredConversations.length} 个对话
        </span>
      </div>

      {/* 标签筛选 */}
      {allTags.length > 0 && onTagSelect && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onTagSelect(null)}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              !selectedTag 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagSelect(tag)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                selectedTag === tag 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">
              {searchQuery ? 'search_off' : 'chat_bubble_outline'}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
            {searchQuery && onSearchChange && (
              <button
                onClick={() => onSearchChange('')}
                className="mt-2 text-sm text-primary hover:underline"
              >
                清除搜索
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedConversations).map(([group, convs]) => 
            convs.length > 0 && (
              <div key={group} className="mb-2">
                <button
                  onClick={() => toggleFolder(group)}
                  className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className={`material-symbols-outlined text-sm transition-transform ${
                    expandedFolders.has(group) || !expandedFolders.size ? '' : '-rotate-90'
                  }`}>
                    expand_more
                  </span>
                  {group}
                  <span className="ml-auto text-gray-400">{convs.length}</span>
                </button>
                
                {(expandedFolders.has(group) || !expandedFolders.size) && (
                  <div className="space-y-0.5">
                    {convs.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                          currentConversationId === conv.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {/* 星标图标 */}
                        {conv.isStarred && (
                          <span className="material-symbols-outlined text-sm text-yellow-400 fill-yellow-400">
                            star
                          </span>
                        )}
                        
                        {/* 标题 */}
                        {editingId === conv.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={saveEditing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="flex-1 bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-primary outline-none text-sm"
                          />
                        ) : (
                          <span className="flex-1 text-sm truncate">
                            {conv.title || '新对话'}
                          </span>
                        )}
                        
                        {/* 时间 */}
                        <span className="text-xs text-gray-400 group-hover:hidden">
                          {formatTime(conv.updatedAt)}
                        </span>
                        
                        {/* 操作按钮 */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          {onRenameConversation && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(conv.id, conv.title);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="重命名"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('确定要删除这个对话吗？')) {
                                onDeleteConversation(conv.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="删除"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};
