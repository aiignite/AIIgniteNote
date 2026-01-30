
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Note, NoteType } from '../types';
import { useLanguageStore } from '../store/languageStore';
import { Folder } from '../services/api';

interface NoteListProps {
  notes: Note[];
  folders?: Folder[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: (type: NoteType, folder?: string) => void;
  onAddFolder?: (name: string, parentId?: string) => void;
  onDeleteFolder?: (id: string) => void;
  onUpdateFolder?: (id: string, name: string) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (note: Note) => void;
  onToggleFavorite?: (id: string) => void;
  width?: number;
  loading?: boolean;
  error?: string | null;
}

type SortMode = 'updatedAt' | 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';

interface ModalConfig {
  isOpen: boolean;
  type: 'input' | 'confirm';
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  confirmColor?: string; // e.g. 'bg-primary' or 'bg-red-500'
  onConfirm: (value: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, folders = [], selectedNoteId, onSelectNote, onAddNote, onAddFolder, onDeleteFolder, onUpdateFolder, onDeleteNote, onUpdateNote, onToggleFavorite, width, loading = false, error = null }) => {
  // Default viewMode changed to 'list' as requested
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { t } = useLanguageStore();

  // Folder State
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modalConfig]);

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
          title: t.noteList.deleteTitle,
          message: t.noteList.deleteMessage,
          confirmLabel: t.noteList.confirmDelete,
          confirmColor: 'bg-red-500 hover:bg-red-600',
          onConfirm: () => onDeleteNote(note.id)
        });
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
             if (val.trim()) onUpdateNote({ ...note, tags: [...note.tags, val.trim()] });
          }
        });
        break;
      case 'folder':
        setModalInputValue(note.folder || '');
        setModalConfig({
          isOpen: true,
          type: 'input',
          title: t.noteList.moveTitle,
          placeholder: t.noteList.movePlaceholder,
          initialValue: note.folder || '',
          confirmLabel: t.noteList.moveBtn,
          onConfirm: (val) => {
             // Allow empty string to move to root/General
             onUpdateNote({ ...note, folder: val.trim() });
          }
        });
        break;
    }
  };

  // Logic to process items based on currentFolder
  const { displayItems } = useMemo(() => {
    let items: (Note | { id: string; isFolder: true; name: string; date: string; noteCount?: number })[] = [];

    if (currentFolder === null) {
      // Root View: Show Folders + Notes in 'General' (or root)
      // Use actual folders from API
      const folderItems = folders.map(folder => ({
        id: `folder-${folder.id}`,
        isFolder: true as const,
        name: folder.name,
        date: folder.updatedAt,
        noteCount: folder.noteCount || 0
      }));

      // Also include legacy folders from notes (for backward compatibility)
      const legacyFolderNames = Array.from(new Set(notes.map(n => n.folder).filter(f => f !== 'General' && f && !folders.some(af => af.name === f)))).sort();
      const legacyFolderItems = legacyFolderNames.map(folderName => {
        const folderNotes = notes.filter(n => n.folder === folderName);
        const latestNote = folderNotes.sort((a,b) => b.timestamp - a.timestamp)[0];
        return {
          id: `folder-legacy-${folderName}`,
          isFolder: true as const,
          name: folderName,
          date: latestNote ? latestNote.updatedAt : ''
        };
      });

      const rootNotes = notes.filter(n => !n.folder || n.folder === 'General').sort((a, b) => b.timestamp - a.timestamp);
      items = [...folderItems, ...legacyFolderItems, ...rootNotes];
    } else {
      // Folder View: Show only notes in this folder
      items = notes
        .filter(n => n.folder === currentFolder);
    }

    // Filter by favorites if active
    if (showFavoritesOnly) {
      items = items.filter(item => {
        if ('isFolder' in item && item.isFolder) return false;
        return (item as Note).isFavorite;
      });
    }

    // Global sorting logic for notes (folders always come first in root, but notes inside folders or root are sorted)
    items = items.sort((a, b) => {
      const isAFolder = 'isFolder' in a && a.isFolder;
      const isBFolder = 'isFolder' in b && b.isFolder;

      // Always keep folders at the top if they are mixed
      if (isAFolder && !isBFolder) return -1;
      if (!isAFolder && isBFolder) return 1;
      
      if (isAFolder && isBFolder) {
        // Sort folders by name always
        return a.name.localeCompare(b.name);
      }

      // Both are notes, apply sortMode and sortOrder
      const noteA = a as Note;
      const noteB = b as Note;
      
      let comparison = 0;
      if (sortMode === 'title') {
        comparison = noteA.title.localeCompare(noteB.title);
      } else if (sortMode === 'createdAt') {
        comparison = new Date(noteA.createdAt).getTime() - new Date(noteB.createdAt).getTime();
      } else {
        comparison = noteA.timestamp - noteB.timestamp;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filteredItems = items.filter(item => {
        // Check if item is a folder by checking for 'isFolder' property
        if ('isFolder' in item && item.isFolder) {
          // Search folder names
          return item.name.toLowerCase().includes(query);
        } else {
          // Search note titles and content
          const note = item as Note;
          return (
            note.title.toLowerCase().includes(query) ||
            (note.content && note.content.toLowerCase().includes(query))
          );
        }
      });
      items = filteredItems;
    }

    return { displayItems: items };
  }, [notes, folders, currentFolder, sortMode, sortOrder, searchQuery, showFavoritesOnly]);

  const noteTypes: { type: NoteType; icon: string; color: string }[] = [
    { type: 'Markdown', icon: 'markdown', color: 'text-blue-500' },
    { type: 'Rich Text', icon: 'format_size', color: 'text-emerald-500' },
    { type: 'Mind Map', icon: 'account_tree', color: 'text-purple-500' },
    { type: 'Drawio', icon: 'draw', color: 'text-orange-500' },
  ];

  const getSortLabel = () => {
    switch(sortMode) {
      case 'createdAt': return t.noteList.sortCreated;
      case 'title': return t.noteList.sortName;
      default: return t.noteList.sortModified;
    }
  };

  const handleAddNoteClick = (type: NoteType) => {
    // Add to current folder if selected, otherwise default (which App handles as General)
    onAddNote(type, currentFolder || undefined);
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
                    onAddFolder(folderName.trim(), currentFolder || undefined);
                } else {
                    // Fallback to old behavior if onAddFolder not provided
                    const newFolderPath = currentFolder
                        ? `${currentFolder}/${folderName.trim()}`
                        : folderName.trim();
                    onAddNote('Markdown', newFolderPath);
                }
            }
        }
    });
    setShowAddMenu(false);
  };

  return (
    <div 
      className="flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-background-dark shrink-0 transition-none relative" 
      style={{ width: width ? `${width}px` : (viewMode === 'grid' ? '300px' : '260px') }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 z-20 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentFolder && (
              <button 
                onClick={() => setCurrentFolder(null)}
                className="p-1 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            )}
            <h2 className="text-lg font-bold truncate max-w-[180px]">
              {currentFolder ? currentFolder : 'PLMS'}
            </h2>
          </div>
          
          {/* Add Note Dropdown */}
          <div className="relative" ref={addMenuRef} onMouseEnter={() => setShowAddMenu(true)} onMouseLeave={() => setShowAddMenu(false)}>
            <button 
              className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            
            {showAddMenu && (
              <div className="absolute top-full right-0 pt-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">
                    {t.noteList.addTo} {currentFolder || 'Root'}
                  </p>
                  {noteTypes.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleAddNoteClick(item.type)}
                      className="w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <span className={`material-symbols-outlined text-lg ${item.color}`}>{item.icon}</span>
                      <span>{item.type}</span>
                    </button>
                  ))}
                  
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

          {/* View Toggles */}
          <div className="flex bg-gray-200 dark:bg-gray-800/50 rounded-lg p-0.5 shrink-0">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-sm">splitscreen</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto scrollbar-hide p-3 flex flex-col ${
        viewMode === 'grid' ? 'gap-3' : 'gap-1'
      }`}>
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
        {!loading && !error && displayItems.length === 0 && (
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
        
        {displayItems.map((item: any) => {
          if (item.isFolder) {
            // RENDER FOLDER ITEM
            return (
              <div 
                key={item.id}
                className={`group relative transition-all border border-transparent cursor-pointer bg-white dark:bg-[#1c2b33] hover:bg-gray-50 dark:hover:bg-gray-800/80
                  ${viewMode === 'grid' ? 'rounded-xl p-4 flex flex-col items-center text-center shadow-sm' : 'px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm'}
                `}
              >
                 <div 
                   onClick={() => setCurrentFolder(item.name)}
                   className={`shrink-0 flex items-center justify-center text-amber-400 ${viewMode === 'grid' ? 'mb-2' : ''}`}
                 >
                    <span className="material-symbols-outlined" style={{ fontSize: viewMode === 'grid' ? '48px' : '24px' }}>folder</span>
                 </div>
                 
                 <div 
                   onClick={() => setCurrentFolder(item.name)}
                   className="flex-1 min-w-0 text-left"
                 >
                   <h3 className={`font-bold text-gray-800 dark:text-gray-200 ${viewMode === 'grid' ? 'text-sm' : 'text-sm'}`}>
                     {item.name}
                   </h3>
                   {viewMode === 'list' && (
                     <p className="text-[10px] text-gray-400 mt-0.5">{item.date}</p>
                   )}
                 </div>
                 
                 {/* Folder action buttons */}
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                   {onUpdateFolder && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         setModalConfig({
                           isOpen: true,
                           type: 'input',
                           title: 'Rename Folder',
                           placeholder: 'New folder name',
                           initialValue: item.name,
                           confirmLabel: 'Rename',
                           confirmColor: 'bg-primary',
                           onConfirm: (newName) => {
                             if (newName.trim() && newName !== item.name) {
                               onUpdateFolder(item.id, newName.trim());
                             }
                             setModalConfig(null);
                           }
                         });
                         setModalInputValue(item.name);
                       }}
                       className="p-1 text-gray-400 hover:text-primary transition-colors"
                       title="Rename folder"
                     >
                       <span className="material-symbols-outlined text-base">edit</span>
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
                           message: `Are you sure you want to delete "${item.name}"? All notes inside will also be deleted.`,
                           confirmLabel: 'Delete',
                           confirmColor: 'bg-red-500',
                           onConfirm: () => {
                             onDeleteFolder(item.id);
                             setModalConfig(null);
                           }
                         });
                       }}
                       className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                       title="Delete folder"
                     >
                       <span className="material-symbols-outlined text-base">delete</span>
                     </button>
                   )}
                 </div>
                 
                 {viewMode === 'list' && (
                    <span 
                      onClick={() => setCurrentFolder(item.name)}
                      className="material-symbols-outlined text-gray-300 text-sm"
                    >
                      chevron_right
                    </span>
                 )}
              </div>
            );
          } else {
            // RENDER NOTE ITEM
            const note = item as Note;
            return (
              <div 
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`group relative transition-all border border-transparent cursor-pointer ${
                  viewMode === 'grid' 
                    ? `rounded-xl p-4 flex flex-col ${
                        selectedNoteId === note.id 
                        ? 'bg-white dark:bg-[#1c2b33] border-primary shadow-md ring-1 ring-primary' 
                        : 'bg-white dark:bg-[#1c2b33] hover:border-gray-200 dark:hover:border-gray-700 shadow-sm'
                      }`
                    : `px-3 py-3 rounded-lg flex items-start gap-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0 ${
                        selectedNoteId === note.id 
                        ? 'bg-primary/5 dark:bg-primary/10' 
                        : 'hover:bg-white dark:hover:bg-gray-800/30'
                      }`
                }`}
              >
                {/* Context Menu Logic */}
                {activeMenuId === note.id && (
                    <div ref={menuRef} className="absolute right-2 top-8 w-40 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 py-1">
                        <button onClick={(e) => handleMenuAction(e, 'favorite', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                          <span className={`material-symbols-outlined text-sm ${note.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}>star</span> 
                          {note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </button>
                        <button onClick={(e) => handleMenuAction(e, 'tags', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">label</span> {t.noteList.tagBtn}...
                        </button>
                        <button onClick={(e) => handleMenuAction(e, 'folder', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">folder</span> {t.noteList.moveBtn}...
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                        <button onClick={(e) => handleMenuAction(e, 'delete', note)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">delete</span> {t.noteList.confirmDelete}
                        </button>
                    </div>
                )}

                {viewMode === 'grid' ? (
                  // DETAILED CARD VIEW (GRID)
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        note.type === 'Markdown' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                        note.type === 'Rich Text' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        note.type === 'Mind Map' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                      }`}>
                          <span className="material-symbols-outlined text-[10px]">
                            {note.type === 'Markdown' ? 'markdown' : 
                            note.type === 'Rich Text' ? 'format_size' : 
                            note.type === 'Mind Map' ? 'account_tree' : 'draw'}
                          </span>
                          {note.type}
                      </div>

                      <div className="flex items-center gap-1">
                        {note.isFavorite && (
                          <span className="material-symbols-outlined text-amber-400 text-sm fill-current">star</span>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === note.id ? null : note.id); }}
                          className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-all ${
                              activeMenuId === note.id ? 'opacity-100 bg-gray-100 dark:bg-gray-700 text-gray-600' : ''
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">more_horiz</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-gray-100">{note.title}</h3>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 h-8 leading-relaxed">
                      {note.content ? note.content.replace(/[#*`>]/g, '') : 'No additional text content.'}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{note.updatedAt}</span>
                    </div>
                  </>
                ) : (
                  // COMPACT LIST VIEW ROW (Styled like screenshot)
                  <>
                    <div className={`shrink-0 p-1.5 rounded-md self-center ${
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
                    
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h3 className={`text-sm font-medium truncate ${selectedNoteId === note.id ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
                        {note.title}
                      </h3>
                       <div className="text-[10px] text-gray-400 truncate flex items-center gap-2">
                          <span>{note.updatedAt}</span>
                          {note.content && (
                            <span className="opacity-60 truncate max-w-[150px]">{String(note.content).substring(0, 30).replace(/[#*]/g, '')}</span>
                          )}
                       </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                      {note.isFavorite && (
                        <span className="material-symbols-outlined text-amber-400 text-sm fill-current">star</span>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === note.id ? null : note.id); }}
                        className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-all ${
                            activeMenuId === note.id ? 'opacity-100' : ''
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">more_horiz</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          }
        })}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400">
        <span>
          {searchQuery
            ? `"${searchQuery}": ${displayItems.length} ${t.noteList.items}`
            : `${displayItems.length} ${t.noteList.items}`
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
