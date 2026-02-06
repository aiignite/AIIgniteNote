/**
 * useConversations Hook
 * 管理对话列表、搜索、排序、标签等功能
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '../../../services/api';
import { indexedDB } from '../../../services/indexedDB';
import type { ConversationSortMode, DateRange, AIConversation } from '../types';

export interface UseConversationsOptions {
  initialConversations?: AIConversation[];
}

export interface UseConversationsReturn {
  // 状态
  conversations: AIConversation[];
  currentConversationId: string | null;
  searchQuery: string;
  sortBy: ConversationSortMode;
  selectedTag: string | null;
  selectedFolder: string | null;
  loadingConversations: boolean;
  
  // 过滤后的对话列表
  filteredConversations: AIConversation[];
  
  // 对话 CRUD
  setConversations: React.Dispatch<React.SetStateAction<AIConversation[]>>;
  setCurrentConversationId: (id: string | null) => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => void;
  
  // 搜索和过滤
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: ConversationSortMode) => void;
  setSelectedTag: (tag: string | null) => void;
  setSelectedFolder: (folder: string | null) => void;
  
  // 标签管理
  conversationTags: Record<string, string[]>;
  addTagToConversation: (conversationId: string, tag: string) => void;
  removeTagFromConversation: (conversationId: string, tag: string) => void;
  
  // 文件夹管理
  conversationFolders: Record<string, string>;
  moveToFolder: (conversationId: string, folder: string) => void;
  
  // 归档管理
  archivedConversations: string[];
  archiveConversation: (id: string) => void;
  unarchiveConversation: (id: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  
  // 星标管理
  starredConversations: Set<string>;
  toggleStarConversation: (id: string) => void;
  
  // 优先级管理
  conversationPriority: Record<string, number>;
  setConversationPriority: (id: string, priority: number) => void;
  
  // 刷新
  refreshConversations: () => Promise<void>;
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const [conversations, setConversations] = useState<AIConversation[]>(options.initialConversations || []);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ConversationSortMode>('time');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  
  // 标签
  const [conversationTags, setConversationTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('conversationTags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // 文件夹
  const [conversationFolders, setConversationFolders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('conversationFolders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // 归档
  const [archivedConversations, setArchivedConversations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chatArchivedConversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showArchived, setShowArchived] = useState(false);
  
  // 星标
  const [starredConversations, setStarredConversations] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chatStarredConversations');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // 优先级
  const [conversationPriority, setConversationPriorityState] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('chatConversationPriorities');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 加载对话列表
  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await api.getAIConversations() as any;
      if (response.success && response.data) {
        setConversations(response.data);
        // 缓存到 IndexedDB
        for (const conv of response.data) {
          try {
            await indexedDB.cacheConversation(conv);
          } catch (e) {
            console.warn('Failed to cache conversation:', e);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // 尝试从 IndexedDB 加载
      try {
        const cached = await indexedDB.getConversations();
        if (cached && cached.length > 0) {
          setConversations(cached);
        }
      } catch (e) {
        console.warn('Failed to load from cache:', e);
      }
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // 过滤后的对话列表
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];
    
    // 过滤归档
    if (!showArchived) {
      filtered = filtered.filter(c => !archivedConversations.includes(c.id));
    } else {
      filtered = filtered.filter(c => archivedConversations.includes(c.id));
    }
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(query) ||
        c.model?.toLowerCase().includes(query)
      );
    }
    
    // 标签过滤
    if (selectedTag) {
      filtered = filtered.filter(c => 
        conversationTags[c.id]?.includes(selectedTag)
      );
    }
    
    // 文件夹过滤
    if (selectedFolder) {
      filtered = filtered.filter(c => 
        conversationFolders[c.id] === selectedFolder
      );
    }
    
    // 排序
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));
        break;
      case 'messages':
        filtered.sort((a, b) => 
          (Array.isArray(b.messages) ? b.messages.length : 0) - 
          (Array.isArray(a.messages) ? a.messages.length : 0)
        );
        break;
      case 'priority':
        filtered.sort((a, b) => 
          (conversationPriority[b.id] || 0) - (conversationPriority[a.id] || 0)
        );
        break;
      case 'time':
      default:
        filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
    
    return filtered;
  }, [conversations, searchQuery, sortBy, selectedTag, conversationTags, selectedFolder, conversationFolders, showArchived, archivedConversations, conversationPriority]);

  // 加载单个对话
  const loadConversation = useCallback(async (id: string) => {
    try {
      const response = await api.getAIConversation(id) as any;
      if (response.success && response.data) {
        setCurrentConversationId(id);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      // 尝试从缓存加载
      const conversations = await indexedDB.getConversations();
      const cached = conversations.find((c: any) => c.id === id);
      if (cached) {
        setCurrentConversationId(id);
        return cached;
      }
    }
  }, []);

  // 删除对话
  const deleteConversation = useCallback(async (id: string) => {
    try {
      const response = await api.deleteAIConversation(id) as any;
      if (response.success) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
        // 从缓存删除
        try {
          await indexedDB.removeConversation(id);
        } catch (e) {
          console.warn('Failed to delete from cache:', e);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [currentConversationId]);

  // 重命名对话
  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  // 标签操作
  const addTagToConversation = useCallback((conversationId: string, tag: string) => {
    setConversationTags(prev => {
      const current = prev[conversationId] || [];
      if (current.includes(tag)) return prev;
      const newTags = { ...prev, [conversationId]: [...current, tag] };
      localStorage.setItem('conversationTags', JSON.stringify(newTags));
      return newTags;
    });
  }, []);

  const removeTagFromConversation = useCallback((conversationId: string, tag: string) => {
    setConversationTags(prev => {
      const current = prev[conversationId] || [];
      const newTags = { ...prev, [conversationId]: current.filter(t => t !== tag) };
      localStorage.setItem('conversationTags', JSON.stringify(newTags));
      return newTags;
    });
  }, []);

  // 文件夹操作
  const moveToFolder = useCallback((conversationId: string, folder: string) => {
    setConversationFolders(prev => {
      const newFolders = { ...prev, [conversationId]: folder };
      localStorage.setItem('conversationFolders', JSON.stringify(newFolders));
      return newFolders;
    });
  }, []);

  // 归档操作
  const archiveConversation = useCallback((id: string) => {
    setArchivedConversations(prev => {
      const newList = [...prev, id];
      localStorage.setItem('chatArchivedConversations', JSON.stringify(newList));
      return newList;
    });
  }, []);

  const unarchiveConversation = useCallback((id: string) => {
    setArchivedConversations(prev => {
      const newList = prev.filter(i => i !== id);
      localStorage.setItem('chatArchivedConversations', JSON.stringify(newList));
      return newList;
    });
  }, []);

  // 星标操作
  const toggleStarConversation = useCallback((id: string) => {
    setStarredConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      localStorage.setItem('chatStarredConversations', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // 优先级操作
  const setConversationPriority = useCallback((id: string, priority: number) => {
    setConversationPriorityState(prev => {
      const newPriorities = { ...prev, [id]: priority };
      localStorage.setItem('chatConversationPriorities', JSON.stringify(newPriorities));
      return newPriorities;
    });
  }, []);

  return {
    // 状态
    conversations,
    currentConversationId,
    searchQuery,
    sortBy,
    selectedTag,
    selectedFolder,
    loadingConversations,
    filteredConversations,
    
    // 对话 CRUD
    setConversations,
    setCurrentConversationId,
    loadConversation,
    deleteConversation,
    renameConversation,
    
    // 搜索和过滤
    setSearchQuery,
    setSortBy,
    setSelectedTag,
    setSelectedFolder,
    
    // 标签
    conversationTags,
    addTagToConversation,
    removeTagFromConversation,
    
    // 文件夹
    conversationFolders,
    moveToFolder,
    
    // 归档
    archivedConversations,
    archiveConversation,
    unarchiveConversation,
    showArchived,
    setShowArchived,
    
    // 星标
    starredConversations,
    toggleStarConversation,
    
    // 优先级
    conversationPriority,
    setConversationPriority,
    
    // 刷新
    refreshConversations,
  };
}
