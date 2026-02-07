
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Note, NoteType, AITemplate } from '../types';
import { useLanguageStore } from '../store/languageStore';
import { Folder } from '../services/api';

// 格式化时间为友好显示
const formatTimeAgo = (dateString: string, isZh: boolean): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return isZh ? '刚刚' : 'Just now';
  } else if (diffMin < 60) {
    return isZh ? `${diffMin}分钟前` : `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return isZh ? `${diffHour}小时前` : `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return isZh ? `${diffDay}天前` : `${diffDay}d ago`;
  } else {
    // 超过7天显示日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return isZh ? `${month}月${day}日` : `${month}/${day}`;
  }
};

interface NoteListProps {
  notes: Note[];
  folders?: Folder[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: (type: NoteType, folderId?: string | null) => void;
  onAddNoteFromTemplate?: (templateId: string, folderId?: string | null) => void;
  onAddFolder?: (name: string, parentId?: string) => void;
  onDeleteFolder?: (id: string) => void;
  onUpdateFolder?: (id: string, name: string) => void;
  onMoveFolder?: (id: string, parentId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (note: Note) => void;
  onToggleFavorite?: (id: string) => void;
  width?: number;
  loading?: boolean;
  error?: string | null;
  templates?: AITemplate[];
  templatesLoading?: boolean;
  isTrashView?: boolean;
  onRestoreNote?: (id: string) => void;
}

type SortMode = 'updatedAt' | 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';

interface ModalConfig {
  isOpen: boolean;
  type: 'input' | 'confirm' | 'folder-tree';
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  confirmColor?: string; // e.g. 'bg-primary' or 'bg-red-500'
  onConfirm: (value: string) => void;
  targetNoteId?: string; // For folder tree modal
}

interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  level: number;
}

interface TreeFolderNode extends Folder {
  type: 'folder';
  children: TreeNode[];
  level: number;
}

interface TreeNoteNode {
  id: string;
  type: 'note';
  note: Note;
  parentId: string | null;
  level: number;
}

type TreeNode = TreeFolderNode | TreeNoteNode;

const NoteList: React.FC<NoteListProps> = ({ notes, folders = [], selectedNoteId, onSelectNote, onAddNote, onAddNoteFromTemplate, onAddFolder, onDeleteFolder, onUpdateFolder, onMoveFolder, onDeleteNote, onUpdateNote, onToggleFavorite, width, loading = false, error = null, templates = [], templatesLoading = false, isTrashView = false, onRestoreNote }) => {
  // Default viewMode changed to 'list' as requested
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeTemplateType, setActiveTemplateType] = useState<NoteType | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Hover delay timer for better UX
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Check templates prop
  useEffect(() => {
    console.log('[NoteList] Templates prop updated:', {
      count: templates?.length || 0,
      loading: templatesLoading,
      templates: templates?.map(t => ({ id: t.id, name: t.name, noteType: t.noteType }))
    });
  }, [templates, templatesLoading]);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { t } = useLanguageStore();

  // Folder State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const folderMap = useMemo(() => new Map((folders || []).map(folder => [folder.id, folder])), [folders]);
  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);
  const currentFolderName = currentFolderId ? (folderMap.get(currentFolderId)?.name || '') : '';

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ type: 'note' | 'folder'; id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const tagsModalRef = useRef<HTMLDivElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (modalConfig?.isOpen && modalConfig.type === 'input') {
      setTimeout(() => {
        modalInputRef.current?.focus();
        modalInputRef.current?.select();
      }, 100);
    }
  }, [modalConfig]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close menus if modal is open to prevent confusion
      if (modalConfig?.isOpen) return;

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
      if (tagsModalRef.current && !tagsModalRef.current.contains(event.target as Node)) {
        setShowTagsModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modalConfig]);

  useEffect(() => {
    if (!showAddMenu) {
      setActiveTemplateType(null);
    }
  }, [showAddMenu]);

  // Cleanup hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const closeModal = () => {
    setModalConfig(null);
    setModalInputValue('');
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (modalConfig) {
      modalConfig.onConfirm(modalInputValue);
      closeModal();
    }
  };

  const handleMenuAction = (e: React.MouseEvent, action: string, note: Note) => {
    e.stopPropagation();
    setActiveMenuId(null);

    switch (action) {
      case 'delete':
        setModalConfig({
          isOpen: true,
          type: 'confirm',
          title: isTrashView ? (t.language === 'zh' ? '永久删除' : 'Permanent Delete') : t.noteList.deleteTitle,
          message: isTrashView ? (t.language === 'zh' ? '确定要从回收站永久删除这个笔记吗？此操作无法恢复。' : 'Are you sure you want to permanently delete this note? This action cannot be undone.') : t.noteList.deleteMessage,
          confirmLabel: isTrashView ? (t.language === 'zh' ? '永久删除' : 'Delete Permanently') : t.noteList.confirmDelete,
          confirmColor: 'bg-red-500 hover:bg-red-600',
          onConfirm: () => onDeleteNote(note.id)
        });
        break;
      case 'restore':
        if (onRestoreNote) onRestoreNote(note.id);
        break;
      case 'favorite':
        if (onToggleFavorite) onToggleFavorite(note.id);
        break;
      case 'tags':
        setModalInputValue('');
        setModalConfig({
          isOpen: true,
          type: 'input',
          title: t.noteList.tagTitle,
          placeholder: t.noteList.tagPlaceholder,
          initialValue: '',
          confirmLabel: t.noteList.tagBtn,
          onConfirm: (val) => {
             if (val.trim()) {
               const newTagName = val.trim();
               const isAlreadyAdded = note.tags.some((t: any) => (typeof t === 'string' ? t : t.name) === newTagName);
               if (!isAlreadyAdded) {
                 onUpdateNote({ ...note, tags: [...note.tags, newTagName] });
               }
             }
          }
        });
        break;
      case 'folder':
        setModalInputValue('');
        setModalConfig({
          isOpen: true,
          type: 'folder-tree',
          title: t.noteList.moveTitle,
          confirmLabel: t.noteList.moveBtn,
          targetNoteId: note.id,
          onConfirm: (folderId) => {
             const folder = folderId ? folders.find(f => f.id === folderId) : null;
             onUpdateNote({
               ...note,
               folder: folder ? folder.name : '',
               folderId: folderId || undefined
             });
          }
        });
        break;
    }
  };

  // Build folder tree from flat folder list
  const buildFolderTree = (folders: Folder[]): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    
    // Initialize all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        level: 0
      });
    });
    
    // Build parent-child relationships
    const rootFolders: FolderTreeNode[] = [];
    folderMap.forEach(folder => {
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          folder.level = parent.level + 1;
          parent.children.push(folder);
        } else {
          rootFolders.push(folder);
        }
      } else {
        rootFolders.push(folder);
      }
    });
    
    // Sort folders alphabetically
    const sortFolders = (folders: FolderTreeNode[]) => {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      folders.forEach(f => sortFolders(f.children));
    };
    sortFolders(rootFolders);
    
    return rootFolders;
  };

  // Logic to process items based on currentFolder
  const folderNameMap = useMemo(() => new Map((folders || []).map(folder => [folder.name, folder.id])), [folders]);

  const { treeNodes, visibleNoteCount } = useMemo(() => {
    const folderNodes = new Map<string, TreeFolderNode>();
    const rootNodes: TreeNode[] = [];

    folders.forEach(folder => {
      folderNodes.set(folder.id, {
        ...folder,
        type: 'folder',
        children: [],
        level: 0
      });
    });

    folderNodes.forEach(node => {
      if (node.parentId && folderNodes.has(node.parentId)) {
        folderNodes.get(node.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    const filteredNotes = notes.filter(note => {
      if (showFavoritesOnly && !note.isFavorite) return false;
      // Add tag filtering
      if (selectedTags.size > 0) {
        const noteTags = note.tags.map(t => typeof t === 'string' ? t : t.name);
        const hasSelectedTag = Array.from(selectedTags).some(tag => noteTags.includes(tag));
        if (!hasSelectedTag) return false;
      }
      return true;
    });

    const resolveNoteFolderId = (note: Note): string | null => {
      if (note.folderId && folderNodes.has(note.folderId)) return note.folderId;
      if (note.folder && folderNameMap.has(note.folder)) return folderNameMap.get(note.folder) || null;
      return null;
    };

    filteredNotes.forEach(note => {
      const targetFolderId = resolveNoteFolderId(note);
      const noteNode: TreeNoteNode = {
        id: note.id,
        type: 'note',
        note,
        parentId: targetFolderId,
        level: 0
      };

      if (targetFolderId && folderNodes.has(targetFolderId)) {
        folderNodes.get(targetFolderId)!.children.push(noteNode);
      } else {
        rootNodes.push(noteNode);
      }
    });

    const sortNotes = (noteA: Note, noteB: Note) => {
      let comparison = 0;
      if (sortMode === 'title') {
        comparison = noteA.title.localeCompare(noteB.title);
      } else if (sortMode === 'createdAt') {
        comparison = new Date(noteA.createdAt).getTime() - new Date(noteB.createdAt).getTime();
      } else {
        comparison = noteA.timestamp - noteB.timestamp;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    };

    const sortChildren = (nodes: TreeNode[]): TreeNode[] => {
      const folderPart = nodes.filter(n => n.type === 'folder') as TreeFolderNode[];
      const notePart = nodes.filter(n => n.type === 'note') as TreeNoteNode[];

      folderPart.sort((a, b) => a.name.localeCompare(b.name));
      notePart.sort((a, b) => sortNotes(a.note, b.note));

      const sortedFolders = folderPart.map(folder => ({
        ...folder,
        children: sortChildren(folder.children)
      }));

      return [...sortedFolders, ...notePart];
    };

    const sortRoot = sortChildren(rootNodes);

    const filterBySearch = (nodes: TreeNode[]): TreeNode[] => {
      if (!searchQuery.trim()) return nodes;
      const query = searchQuery.toLowerCase();

      const filtered: TreeNode[] = [];

      nodes.forEach(node => {
        if (node.type === 'note') {
          const matches = node.note.title.toLowerCase().includes(query) ||
            (node.note.content && node.note.content.toLowerCase().includes(query));
          if (matches) filtered.push(node);
        } else {
          const childMatches = filterBySearch(node.children);
          const folderMatches = node.name.toLowerCase().includes(query);
          if (folderMatches || childMatches.length > 0) {
            filtered.push({ ...node, children: childMatches });
          }
        }
      });

      return filtered;
    };

    const filteredRoot = filterBySearch(sortRoot);

    const applyLevel = (nodes: TreeNode[], level: number): TreeNode[] => {
      return nodes.map(node => {
        if (node.type === 'note') {
          return { ...node, level } as TreeNoteNode;
        }
        return { ...node, level, children: applyLevel(node.children, level + 1) } as TreeFolderNode;
      });
    };

    const leveled = applyLevel(filteredRoot, 0);

    const countNotes = (nodes: TreeNode[]): number => {
      return nodes.reduce((acc, node) => {
        if (node.type === 'note') return acc + 1;
        return acc + countNotes(node.children);
      }, 0);
    };

    return { treeNodes: leveled, visibleNoteCount: countNotes(leveled) };
  }, [folders, notes, folderNameMap, showFavoritesOnly, sortMode, sortOrder, searchQuery, selectedTags]);

  const noteTypes: { type: NoteType; icon: string; color: string }[] = [
    { type: 'Markdown', icon: 'markdown', color: 'text-blue-500' },
    { type: 'Rich Text', icon: 'format_size', color: 'text-emerald-500' },
    { type: 'Mind Map', icon: 'account_tree', color: 'text-purple-500' },
    { type: 'Drawio', icon: 'draw', color: 'text-orange-500' },
  ];

  const mapTemplateNoteType = (templateType?: string | null): NoteType | null => {
    switch (templateType) {
      case 'MARKDOWN':
        return 'Markdown';
      case 'RICHTEXT':
        return 'Rich Text';
      case 'MINDMAP':
        return 'Mind Map';
      case 'FLOWCHART':
        return 'Drawio';
      default:
        return null;
    }
  };

  const templatesByType = useMemo(() => {
    const buckets: Record<NoteType, AITemplate[]> = {
      Markdown: [],
      'Rich Text': [],
      'Mind Map': [],
      Drawio: [],
    };

    console.log('[NoteList] Processing templates:', templates?.length || 0);
    (templates || []).forEach((tmpl) => {
      const mapped = mapTemplateNoteType(tmpl.noteType);
      console.log('[NoteList] Template:', tmpl.name, 'noteType:', tmpl.noteType, 'mapped:', mapped);
      if (mapped) {
        buckets[mapped].push(tmpl);
      }
    });

    console.log('[NoteList] Templates by type:', {
      Markdown: buckets.Markdown.length,
      'Rich Text': buckets['Rich Text'].length,
      'Mind Map': buckets['Mind Map'].length,
      Drawio: buckets.Drawio.length,
    });

    return buckets;
  }, [templates]);

  const getSortLabel = () => {
    switch(sortMode) {
      case 'createdAt': return t.noteList.sortCreated;
      case 'title': return t.noteList.sortName;
      default: return t.noteList.sortModified;
    }
  };

  // 获取所有可用的tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        tagSet.add(tagName);
      });
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // UUID校验函数
  const isValidUUID = (id: string | null | undefined): boolean => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // cuid 格式校验（Prisma 默认生成的 ID 格式）
  const isValidCuid = (id: string | null | undefined): boolean => {
    if (!id) return false;
    // cuid 通常是 25 个字符，以 c 开头
    return /^c[a-z0-9]{20,30}$/i.test(id);
  };

  // 验证是否是有效的数据库 ID
  const isValidId = (id: string | null | undefined): boolean => {
    return isValidUUID(id) || isValidCuid(id);
  };

  const resolveTargetFolderId = (): string | null => {
    // 优先使用当前选中笔记的folderId
    if (selectedNote?.folderId && isValidId(selectedNote.folderId)) {
      // 验证这个 folderId 在 folders 列表中存在
      const folderExists = folders.some(f => f.id === selectedNote.folderId);
      if (folderExists) {
        return selectedNote.folderId;
      }
    }
    // 通过文件夹名查找folderId
    if (selectedNote?.folder && selectedNote.folder !== 'General') {
      const matchedFolder = folders.find(f => f.name === selectedNote.folder);
      if (matchedFolder && isValidId(matchedFolder.id)) {
        return matchedFolder.id;
      }
    }
    // 其次使用当前浏览的文件夹
    if (currentFolderId && isValidId(currentFolderId)) {
      return currentFolderId;
    }
    // 返回 null 表示放在根目录
    return null;
  };

  const handleAddNoteClick = (type: NoteType) => {
    const targetFolderId = resolveTargetFolderId();
    onAddNote(type, targetFolderId ?? undefined);
    setShowAddMenu(false);
  };

  const handleTemplateCreate = (templateId: string) => {
    if (!onAddNoteFromTemplate) return;
    const targetFolderId = resolveTargetFolderId();
    onAddNoteFromTemplate(templateId, targetFolderId ?? undefined);
    setShowAddMenu(false);
  };

  const handleCreateFolder = () => {
    setModalInputValue('');
    setModalConfig({
        isOpen: true,
        type: 'input',
        title: t.noteList.folderInputTitle,
        placeholder: t.noteList.folderInputPlaceholder,
        initialValue: '',
        confirmLabel: t.noteList.create,
        onConfirm: (folderName) => {
            if (folderName && folderName.trim()) {
                if (onAddFolder) {
                    // Call the proper folder creation API
                onAddFolder(folderName.trim(), currentFolderId || undefined);
                }
            }
        }
    });
    setShowAddMenu(false);
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Drag and drop handlers
  const isFolderDescendant = useCallback((folderId: string, targetId: string | null) => {
    if (!targetId) return false;
    let current: string | null | undefined = targetId;
    while (current) {
      if (current === folderId) return true;
      current = folderMap.get(current)?.parentId || null;
    }
    return false;
  }, [folderMap]);

  const handleDragStart = (e: React.DragEvent, item: { type: 'note' | 'folder'; id: string }) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    if (!draggedItem) return;

    if (draggedItem.type === 'folder') {
      if (folderId === draggedItem.id) return;
      if (isFolderDescendant(draggedItem.id, folderId)) return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragEnter = (e: React.DragEvent, folderId: string | null) => {
    if (!draggedItem) return;
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'note') {
      const note = notes.find(n => n.id === draggedItem.id);
      if (note) {
        const folder = folderId ? folders.find(f => f.id === folderId) : null;
        onUpdateNote({
          ...note,
          folder: folder ? folder.name : '',
          folderId: folderId ?? null
        });
      }
    } else if (draggedItem.type === 'folder' && onMoveFolder) {
      if (folderId === draggedItem.id) return;
      if (isFolderDescendant(draggedItem.id, folderId)) return;
      onMoveFolder(draggedItem.id, folderId || null);
    }

    setDraggedItem(null);
    setDragOverFolderId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverFolderId(null);
  };

  // 渲染树节点（包含文件夹和笔记）
  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    if (node.type === 'note') {
      const note = node.note;
      const paddingLeft = node.level * 16 + 36;

      return (
        <div
          key={note.id}
          draggable={!isTrashView}
          onDragStart={(e) => handleDragStart(e, { type: 'note', id: note.id })}
          onDragEnd={handleDragEnd}
          onClick={() => onSelectNote(note.id)}
          className={`group relative transition-all cursor-pointer rounded-lg px-3 py-2.5 flex items-center gap-2.5 ${
            selectedNoteId === note.id 
              ? 'bg-primary/5 dark:bg-primary/10' 
              : 'hover:bg-white dark:hover:bg-gray-800/30'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div className={`shrink-0 p-1.5 rounded-md ${
            note.type === 'Markdown' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
            note.type === 'Rich Text' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
            note.type === 'Mind Map' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
            'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {note.type === 'Markdown' ? 'markdown' : 
              note.type === 'Rich Text' ? 'format_size' : 
              note.type === 'Mind Map' ? 'account_tree' : 'draw'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium truncate ${selectedNoteId === note.id ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
              {note.title}
            </h3>
            <div className="text-[10px] text-gray-400 truncate">{formatTimeAgo(note.updatedAt, t.language === 'zh')}</div>
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {note.tags.slice(0, 2).map((tag, idx) => {
                const tagObj = typeof tag === 'string' ? { name: tag, color: '#6b7280' } : tag;
                return (
                  <span 
                    key={idx}
                    className="text-[9px] px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: `${tagObj.color}20`, color: tagObj.color }}
                  >
                    {tagObj.name}
                  </span>
                );
              })}
              {note.tags.length > 2 && (
                <span className="text-[9px] text-gray-400">+{note.tags.length - 2}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            {note.isFavorite && (
              <span className="material-symbols-outlined text-amber-400 text-sm fill-current">star</span>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === note.id ? null : note.id); }}
              className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 ${
                  activeMenuId === note.id ? 'opacity-100' : ''
              }`}
            >
              <span className="material-symbols-outlined text-base">more_horiz</span>
            </button>
          </div>

          {activeMenuId === note.id && (
            <div ref={menuRef} className="absolute right-2 top-8 w-40 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1">
              <button onClick={(e) => handleMenuAction(e, 'favorite', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${note.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}>star</span> 
                {note.isFavorite ? 'Remove Favorite' : 'Add Favorite'}
              </button>
              <button onClick={(e) => handleMenuAction(e, 'tags', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">label</span> Add Tag
              </button>
              <button onClick={(e) => handleMenuAction(e, 'folder', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">folder</span> Move
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
              <button onClick={(e) => handleMenuAction(e, 'delete', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">delete</span> Delete
              </button>
            </div>
          )}
        </div>
      );
    }

    const isExpanded = searchQuery.trim() ? true : expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = node.level * 16 + 12;
    const isDragOver = dragOverFolderId === node.id;

    return (
      <div key={node.id} className="mb-0.5">
        <div
          draggable={!isTrashView}
          onDragStart={(e) => handleDragStart(e, { type: 'folder', id: node.id })}
          onDragEnd={handleDragEnd}
          onDragEnter={(e) => handleDragEnter(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          className={`group relative transition-all cursor-pointer rounded-lg flex items-center gap-2 px-3 py-2.5 ${
            isDragOver 
              ? 'bg-primary/10 border-2 border-primary border-dashed' 
              : 'hover:bg-white dark:hover:bg-gray-800/30'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleFolder(node.id)}
              className="shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <span className="material-symbols-outlined text-sm text-gray-400">
                {isExpanded ? 'expand_more' : 'chevron_right'}
              </span>
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div 
            onClick={() => setCurrentFolderId(node.id)}
            className="flex-1 flex items-center gap-2 min-w-0"
          >
            <span className="material-symbols-outlined text-xl text-amber-400 shrink-0">
              {isExpanded ? 'folder_open' : 'folder'}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                {node.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalInputValue('');
                setModalConfig({
                  isOpen: true,
                  type: 'input',
                  title: 'New Subfolder',
                  placeholder: 'Folder name',
                  confirmLabel: 'Create',
                  onConfirm: (name) => {
                    if (name.trim() && onAddFolder) {
                      onAddFolder(name.trim(), node.id);
                    }
                  }
                });
              }}
              className="p-1 text-gray-400 hover:text-primary transition-colors"
              title="Add subfolder"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
            </button>
            {onUpdateFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalInputValue(node.name);
                  setModalConfig({
                    isOpen: true,
                    type: 'input',
                    title: 'Rename Folder',
                    placeholder: 'New name',
                    initialValue: node.name,
                    confirmLabel: 'Rename',
                    onConfirm: (name) => {
                      if (name.trim() && name !== node.name) {
                        onUpdateFolder(node.id, name.trim());
                      }
                    }
                  });
                }}
                className="p-1 text-gray-400 hover:text-primary transition-colors"
                title="Rename folder"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            )}
            {onDeleteFolder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalConfig({
                    isOpen: true,
                    type: 'confirm',
                    title: 'Delete Folder',
                    message: `Delete "${node.name}" and all its contents?`,
                    confirmLabel: 'Delete',
                    confirmColor: 'bg-red-500',
                    onConfirm: () => onDeleteFolder(node.id)
                  });
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete folder"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-0.5">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Render folder tree picker recursively
  const renderFolderPicker = (folder: FolderTreeNode, onSelect: (folderId: string) => void): React.ReactNode => {
    const paddingLeft = folder.level * 16 + 12;
    
    return (
      <div key={folder.id}>
        <button
          onClick={() => onSelect(folder.id)}
          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <span className="material-symbols-outlined text-sm text-amber-400">folder</span>
          <span className="text-sm">{folder.name}</span>
        </button>
        {folder.children && folder.children.map(child => renderFolderPicker(child, onSelect))}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-background-dark shrink-0 transition-none relative overflow-visible" 
      style={{ width: width ? `${width}px` : (viewMode === 'grid' ? '300px' : '260px') }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 z-20 relative overflow-visible">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <button 
                onClick={() => setCurrentFolderId(null)}
                className="p-1 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            )}
            <h2 className="text-lg font-bold truncate max-w-[180px]">
              {currentFolderId ? (currentFolderName || 'AI Ignite Note') : 'AI Ignite Note'}
            </h2>
          </div>
          
          {/* Add Note Dropdown */}
          {!isTrashView && (
            <div className="relative" ref={addMenuRef} onMouseEnter={() => setShowAddMenu(true)} onMouseLeave={() => setShowAddMenu(false)}>
              <button 
                className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full right-0 pt-2 w-48 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-visible p-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">
                      {t.noteList.addTo} {currentFolderName || 'Root'}
                    </p>
                    {noteTypes.map((item) => {
                      const typeTemplates = templatesByType[item.type] || [];
                      const showTemplateMenu = activeTemplateType === item.type && typeTemplates.length > 0;

                      console.log('[NoteList] Rendering type:', item.type, {
                        templatesCount: typeTemplates.length,
                        activeType: activeTemplateType,
                        showMenu: showTemplateMenu,
                        templates: typeTemplates.map(t => t.name)
                      });

                      return (
                        <div
                          key={item.type}
                          className="relative"
                          onMouseEnter={() => {
                            // 清除任何待关闭的定时器
                            if (hoverTimerRef.current) {
                              clearTimeout(hoverTimerRef.current);
                              hoverTimerRef.current = null;
                            }
                            // 悬停时显示子菜单（如果有模板）
                            if (typeTemplates.length > 0) {
                              setActiveTemplateType(item.type);
                            }
                          }}
                          onMouseLeave={() => {
                            // 延迟关闭子菜单，给用户时间移动鼠标
                            if (hoverTimerRef.current) {
                              clearTimeout(hoverTimerRef.current);
                            }
                            hoverTimerRef.current = setTimeout(() => {
                              setActiveTemplateType(null);
                            }, 500); // 500ms 延迟
                          }}
                        >
                          <button
                            data-note-type={item.type}
                            onClick={() => handleAddNoteClick(item.type)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                          >
                            <span className={`material-symbols-outlined text-lg ${item.color}`}>{item.icon}</span>
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="truncate">{item.type}</span>
                              <div className="flex items-center gap-1 text-gray-400">
                                {templatesLoading && activeTemplateType === item.type && (
                                  <span className="material-symbols-outlined text-xs animate-spin">autorenew</span>
                                )}
                                {typeTemplates.length > 0 && !templatesLoading && (
                                  <>
                                    <span className="text-[10px]">{typeTemplates.length}</span>
                                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Template submenu - show on hover with delay before hiding */}
                          {typeTemplates.length > 0 && activeTemplateType === item.type && (
                            <div 
                              className="absolute left-full top-0 ml-0 bg-white dark:bg-[#1c2b33] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 w-48"
                              style={{ zIndex: 99999 }}
                              onMouseEnter={() => {
                                // 鼠标进入子菜单时，取消关闭定时器
                                if (hoverTimerRef.current) {
                                  clearTimeout(hoverTimerRef.current);
                                  hoverTimerRef.current = null;
                                }
                              }}
                              onMouseLeave={() => {
                                // 鼠标离开子菜单时，延迟关闭
                                if (hoverTimerRef.current) {
                                  clearTimeout(hoverTimerRef.current);
                                }
                                hoverTimerRef.current = setTimeout(() => {
                                  setActiveTemplateType(null);
                                }, 300);
                              }}
                            >
                              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 mb-1">模板</div>
                              <div className="max-h-60 overflow-y-auto">
                                {typeTemplates.map((tmpl) => (
                                  <button
                                    key={tmpl.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleTemplateCreate(tmpl.id);
                                      setActiveTemplateType(null);
                                      setShowAddMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
                                  >
                                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate block">{tmpl.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Divider and New Folder Option */}
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                    <button
                      onClick={handleCreateFolder}
                      className="w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-amber-500">create_new_folder</span>
                      <span>{t.noteList.newFolder}</span>
                    </button>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400">
              <span className="material-symbols-outlined text-sm">search</span>
            </div>
            <input
              className="block w-full pl-8 pr-8 py-1.5 bg-white dark:bg-[#1c2b33] border-none rounded-lg text-sm placeholder-gray-400 focus:ring-1 focus:ring-primary transition-shadow"
              placeholder={t.noteList.searchPlaceholder}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          
          {/* Favorite Toggle Button */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-1.5 rounded-lg transition-all h-full flex items-center justify-center ${
              showFavoritesOnly 
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                : 'bg-gray-200 dark:bg-gray-800/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={showFavoritesOnly ? "Show All Notes" : "Show Favorites Only"}
          >
            <span className={`material-symbols-outlined text-sm ${showFavoritesOnly ? 'fill-current' : ''}`}>
              star
            </span>
          </button>

          {/* Sort Button */}
          <div className="relative" ref={sortMenuRef}>
             <button
               onClick={() => setShowSortMenu(!showSortMenu)}
               className="p-1.5 bg-gray-200 dark:bg-gray-800/50 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 h-full flex items-center justify-center"
               title={`Sort by: ${getSortLabel()}`}
             >
               <span className="material-symbols-outlined text-sm">sort</span>
             </button>
             {showSortMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort Field</div>
                  {[
                    { id: 'updatedAt', label: t.noteList.sortModified },
                    { id: 'createdAt', label: t.noteList.sortCreated },
                    { id: 'title', label: t.noteList.sortName }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => { setSortMode(option.id as SortMode); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${sortMode === option.id ? 'text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {option.label}
                      {sortMode === option.id && <span className="material-symbols-outlined text-xs">check</span>}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order</div>
                  {[
                    { id: 'desc', label: 'Descending', icon: 'south' },
                    { id: 'asc', label: 'Ascending', icon: 'north' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => { setSortOrder(option.id as SortOrder); }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${sortOrder === option.id ? 'text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">{option.icon}</span>
                        {option.label}
                      </div>
                      {sortOrder === option.id && <span className="material-symbols-outlined text-xs">check</span>}
                    </button>
                  ))}
                </div>
             )}
          </div>

          {/* Tag Search Button */}
          <div className="relative" ref={tagsModalRef}>
            <button
              onClick={() => setShowTagsModal(!showTagsModal)}
              className={`p-1.5 rounded-lg transition-all h-full flex items-center justify-center ${
                selectedTags.size > 0 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-200 dark:bg-gray-800/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={selectedTags.size > 0 ? `${selectedTags.size} tag(s) selected` : "Filter by tags"}
            >
              <span className="material-symbols-outlined text-sm">label</span>
              {selectedTags.size > 0 && (
                <span className="ml-1 text-xs font-bold">{selectedTags.size}</span>
              )}
            </button>
            
            {showTagsModal && (
              <div className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Available Tags</p>
                  {availableTags.length === 0 ? (
                    <p className="text-xs text-gray-500">No tags available</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            const newTags = new Set(selectedTags);
                            if (newTags.has(tag)) {
                              newTags.delete(tag);
                            } else {
                              newTags.add(tag);
                            }
                            setSelectedTags(newTags);
                          }}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            selectedTags.has(tag)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTags.size > 0 && (
                  <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setSelectedTags(new Set())}
                      className="w-full px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 flex flex-col gap-1">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-xs text-gray-400">Loading notes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <span className="material-symbols-outlined text-4xl mb-2 text-red-400">error</span>
            <p className="text-xs text-gray-400 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && treeNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
             <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
               {searchQuery ? 'search_off' : 'folder_open'}
             </span>
             <p className="text-xs">
               {searchQuery
                 ? `No notes found matching "${searchQuery}"`
                 : t.noteList.emptyFolder
               }
             </p>
             {searchQuery && (
               <button
                 onClick={() => setSearchQuery('')}
                 className="mt-2 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
               >
                 Clear search
               </button>
             )}
          </div>
        )}
        {!loading && !error && treeNodes.length > 0 && (
          <>
            {draggedItem && (
              <div
                onDragEnter={(e) => handleDragEnter(e, null)}
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
                className={`mb-2 text-[11px] px-3 py-2 rounded-lg border border-dashed ${
                  dragOverFolderId === null ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-gray-500 dark:text-gray-400'
                }`}
              >
                {t.language === 'zh' ? '拖到这里移动到根目录' : 'Drop here to move into root'}
              </div>
            )}
            {treeNodes.map(node => renderTreeNode(node))}
          </>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400">
        <span>
          {searchQuery
            ? `"${searchQuery}": ${visibleNoteCount} ${t.noteList.items}`
            : `${visibleNoteCount} ${t.noteList.items}`
          }
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span> {t.noteList.cloudSynced}
        </span>
      </div>

      {/* CUSTOM MODAL OVERLAY */}
      {modalConfig?.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white dark:bg-[#15232a] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4">
              <h3 className="text-sm font-bold mb-1">{modalConfig.title}</h3>
              {modalConfig.message && <p className="text-xs text-gray-500 mb-4">{modalConfig.message}</p>}
              
              {modalConfig.type === 'input' && (
                <form onSubmit={handleModalSubmit}>
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={modalInputValue}
                    onChange={(e) => setModalInputValue(e.target.value)}
                    placeholder={modalConfig.placeholder}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all mb-4"
                  />
                </form>
              )}
              
              {modalConfig.type === 'folder-tree' && (
                <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {/* Root folder option */}
                  <button
                    onClick={() => {
                      modalConfig.onConfirm('');
                      setModalConfig(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 mb-1"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-400">folder</span>
                    <span className="text-sm">{t.language === 'zh' ? '根目录' : 'Root'}</span>
                  </button>
                  
                  {/* Folder tree */}
                  {buildFolderTree(folders).map(folder => 
                    renderFolderPicker(folder, (folderId) => {
                      modalConfig.onConfirm(folderId);
                      setModalConfig(null);
                    })
                  )}
                </div>
              )}
              
              {modalConfig.type !== 'folder-tree' && (
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={closeModal}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t.noteList.cancel}
                  </button>
                  <button 
                    onClick={() => handleModalSubmit()}
                    className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${modalConfig.confirmColor || 'bg-primary hover:bg-primary/90'}`}
                  >
                    {modalConfig.confirmLabel || t.noteList.create}
                  </button>
                </div>
              )}
              
              {modalConfig.type === 'folder-tree' && (
                <div className="flex justify-end">
                  <button 
                    onClick={closeModal}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t.noteList.cancel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
