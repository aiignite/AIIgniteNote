
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, NoteType } from '../types';
import MarkdownEditor from './editors/MarkdownEditor';
import RichTextEditor from './editors/RichTextEditor';
import MindMapEditor from './editors/MindMapEditor';
import DrawioEditor from './editors/DrawioEditor';
import { useLanguageStore } from '../store/languageStore';
import { api } from '../services/api';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (updatedNote: Note) => void;
  aiPanelOpen?: boolean;
  onToggleAiPanel?: () => void;
}

const Editor: React.FC<EditorProps> = ({ note, onUpdateNote, aiPanelOpen, onToggleAiPanel }) => {
  const [activeMode, setActiveMode] = useState<NoteType>('Markdown');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local title state to prevent overwrites from API responses
  const [localTitle, setLocalTitle] = useState(note?.title || '');

  const { t } = useLanguageStore();

  // Tag Menu State
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Array<{name: string, color: string}>>([
    { name: 'Important', color: '#ef4444' },
    { name: 'Work', color: '#3b82f6' },
    { name: 'Personal', color: '#10b981' },
    { name: 'Draft', color: '#f59e0b' },
    { name: 'To Do', color: '#8b5cf6' },
    { name: 'Ideas', color: '#ec4899' }
  ]);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Fetch available tags when menu opens
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response: any = await api.getTags();
        if (response.success && response.data) {
          const fetchedTags = response.data.map((t: any) => ({
            name: t.name,
            color: t.color || '#6b7280'
          }));
          
          setAvailableTags(prev => {
            const combined = [...prev];
            fetchedTags.forEach((ft: any) => {
              if (!combined.find(t => t.name === ft.name)) {
                combined.push(ft);
              }
            });
            return combined;
          });
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    if (showTagMenu) {
      fetchTags();
    }
  }, [showTagMenu]);

  // Debounced update ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<Note> | null>(null);
  const pendingUpdateNoteIdRef = useRef<string | null>(null);

  // Sync active mode with note type when note changes
  useEffect(() => {
    if (note) {
      console.log('[Editor] Note changed, setting active mode:', {
        noteId: note.id,
        noteType: note.type,
        noteTitle: note.title,
        previousMode: activeMode
      });
      setActiveMode(note.type);
    }
  }, [note?.id, note?.type]);

  // Clear pending updates when switching notes to avoid cross-note overwrite
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingUpdateRef.current = null;
    pendingUpdateNoteIdRef.current = null;
    setIsSaving(false);
  }, [note?.id]);

  // Sync local title when note changes (e.g., when switching between notes)
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title);
    }
  }, [note?.id]); // Only sync when note ID changes, not on every render

  // Debounced save function
  const debouncedUpdate = useCallback((updates: Partial<Note>) => {
    if (!note) return;

    console.log('[Editor] debouncedUpdate called with updates:', updates);
    console.log('[Editor] Full note object before update:', {
      id: note?.id,
      title: note?.title,
      contentLength: note?.content?.length || 0,
      contentType: typeof note?.content
    });

    // Store pending updates
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...updates };
    pendingUpdateNoteIdRef.current = note.id;
    setIsSaving(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (pendingUpdateRef.current && note && pendingUpdateNoteIdRef.current === note.id) {
        console.log('[Editor] Triggering onUpdateNote after debounce:', {
          pendingUpdates: pendingUpdateRef.current,
          finalContent: pendingUpdateRef.current.content,
          finalContentLength: pendingUpdateRef.current.content?.length || 0
        });
        onUpdateNote({ ...note, ...pendingUpdateRef.current });
        pendingUpdateRef.current = null;
        pendingUpdateNoteIdRef.current = null;
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce
  }, [note, onUpdateNote]);

  // Immediate save for certain actions (like tag changes)
  const immediateUpdate = useCallback((updates: Partial<Note>) => {
    if (!note) return;

    // Cancel any pending debounced update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    pendingUpdateRef.current = null;
    pendingUpdateNoteIdRef.current = null;
    onUpdateNote({ ...note, ...updates });
  }, [note, onUpdateNote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        // Save any pending updates (including unsaved title changes)
        if (pendingUpdateRef.current && note) {
          console.log('[Editor] Saving pending updates on unmount:', pendingUpdateRef.current);
          onUpdateNote({ ...note, ...pendingUpdateRef.current });
        }
      }
    };
  }, [note, onUpdateNote]);

  // Detect dark mode from html class
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    
    // Observer to watch for class changes on html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Close tag menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
        setShowTagMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus tag input when menu opens
  useEffect(() => {
    if (showTagMenu) {
      setTimeout(() => {
        tagInputRef.current?.focus();
      }, 50);
    }
  }, [showTagMenu]);

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#0c1419] text-gray-400">
        <div className="size-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">edit_document</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.editor.noNoteSelected}</h3>
        <p className="text-sm mt-2">{t.editor.noNoteDesc}</p>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value); // Update local state immediately
    debouncedUpdate({ title: e.target.value }); // Still trigger the debounced update
  };

  const handleContentChange = (newContent: string) => {
    console.log('[Editor] handleContentChange called:', {
      newContent,
      newLength: newContent.length,
      noteId: note?.id,
      noteType: note?.type,
      oldContentLength: note?.content?.length || 0
    });
    debouncedUpdate({ content: newContent });
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    const existingTagNames = note.tags.map(t => typeof t === 'string' ? t : t.name);
    
    if (!existingTagNames.includes(trimmed)) {
      // Find if this tag exists in availableTags to get its color
      const existingAvailable = availableTags.find(t => t.name === trimmed);
      const tagColor = existingAvailable ? existingAvailable.color : selectedColor;
      
      const newTagObj = { name: trimmed, color: tagColor };
      
      // Update local note tags
      immediateUpdate({ tags: [...note.tags, newTagObj] });
      
      // Add to available tags list if not already there
      setAvailableTags(prev => {
        if (!prev.find(t => t.name === trimmed)) {
          return [...prev, newTagObj];
        }
        return prev;
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagNameToRemove: string) => {
    immediateUpdate({ 
      tags: note.tags.filter(t => (typeof t === 'string' ? t : t.name) !== tagNameToRemove) 
    });
  };

  const handleToggleTag = (tagName: string) => {
    const existingTagNames = note.tags.map(t => typeof t === 'string' ? t : t.name);
    if (existingTagNames.includes(tagName)) {
      handleRemoveTag(tagName);
    } else {
      handleAddTag(tagName);
    }
  };

  const renderEditor = () => {
    switch (activeMode) {
      case 'Markdown':
        return <MarkdownEditor key={note.id} value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
      case 'Rich Text':
        return <RichTextEditor key={note.id} value={note.content} onChange={handleContentChange} />;
      case 'Mind Map':
        return <MindMapEditor key={note.id} value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
      case 'Drawio':
        return <DrawioEditor key={note.id} value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
      default:
        return <div>Unknown Editor Type</div>;
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-[#0c1419] overflow-hidden">
      <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-[#0c1419] z-10">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button className="lg:hidden text-gray-400 hover:text-primary">
            <span className="material-symbols-outlined">menu</span>
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`shrink-0 p-1.5 rounded-lg flex items-center justify-center ${
              note.type === 'Markdown' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              note.type === 'Rich Text' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
              note.type === 'Mind Map' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
              'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {note.type === 'Markdown' ? 'markdown' : 
                 note.type === 'Rich Text' ? 'format_size' : 
                 note.type === 'Mind Map' ? 'account_tree' : 'draw'}
              </span>
            </div>
             <input
               className="w-full max-w-md text-xl font-bold bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white p-0 placeholder-gray-300 truncate"
               value={localTitle}
               onChange={handleTitleChange}
               placeholder={t.editor.untitled}
             />
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Save Status Indicator */}
          <div className={`flex items-center gap-1.5 text-xs transition-colors ${
            isSaving ? 'text-yellow-500' : 'text-green-500'
          }`} title={isSaving ? (t.editor?.saving || 'Saving...') : (t.editor?.saved || 'Saved')}>
            <span className={`material-symbols-outlined text-[14px] ${isSaving ? 'animate-spin' : ''}`} aria-hidden="false">
              {isSaving ? 'autorenew' : 'check_circle'}
            </span>
            <span className="sr-only">
              {isSaving ? (t.editor?.saving || 'Saving...') : (t.editor?.saved || 'Saved')}
            </span>
          </div>

          {/* Tag List Display */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[200px] scrollbar-hide">
            {note.tags.map(tag => {
              const tagName = typeof tag === 'string' ? tag : tag.name;
              const tagColor = typeof tag === 'string' 
                ? (availableTags.find(t => t.name === tag)?.color || '#6b7280')
                : tag.color;
              return (
                <span 
                  key={tagName} 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 whitespace-nowrap border transition-colors shadow-sm"
                  style={{ 
                    backgroundColor: `${tagColor}15`, 
                    color: tagColor,
                    borderColor: `${tagColor}30`
                  }}
                >
                  #{tagName}
                  <button onClick={() => handleRemoveTag(tagName)} className="hover:opacity-70 flex items-center justify-center">
                     <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </span>
              );
            })}
          </div>

          {/* Tag Dropdown Menu */}
          <div className="relative" ref={tagMenuRef}>
            <button 
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-0 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                showTagMenu 
                  ? 'text-primary bg-primary/10 ring-1 ring-primary/20' 
                  : 'text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
              title={t.editor.addTag}
            >
               <span className="material-symbols-outlined text-sm">label</span>
               <span className="sr-only">{t.editor.addTag}</span>
            </button>

            {showTagMenu && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1c2b33] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 z-[100] animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Manage Tags</span>
                  <button onClick={() => setShowTagMenu(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4 max-h-40 overflow-y-auto scrollbar-hide py-1">
                  {availableTags.length === 0 && (
                    <p className="text-[11px] text-gray-400 py-2 w-full text-center">No tags yet. Create one below!</p>
                  )}
                  {availableTags.map(t => {
                    const isSelected = note.tags.some(nt => (typeof nt === 'string' ? nt : nt.name) === t.name);
                    return (
                      <button
                        key={t.name}
                        onClick={() => handleToggleTag(t.name)}
                        className={`px-3 py-1.5 rounded-full text-[11px] transition-all flex items-center gap-1.5 border ${
                          isSelected 
                            ? 'font-bold shadow-md ring-2 ring-opacity-20' 
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={isSelected ? {
                          backgroundColor: t.color,
                          color: '#fff',
                          borderColor: t.color,
                          boxShadow: `0 4px 6px -1px ${t.color}40`
                        } : {}}
                      >
                         <span className="material-symbols-outlined text-[12px]">
                           {isSelected ? 'check' : 'tag'}
                         </span>
                         {t.name}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add New Tag</label>
                      <div className="flex gap-1.5">
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'].map(color => (
                          <div 
                            key={color} 
                            onClick={() => setSelectedColor(color)}
                            className={`size-4 rounded-full cursor-pointer transition-all border-2 ${
                              selectedColor === color ? 'border-white ring-2 ring-primary scale-125' : 'border-transparent hover:scale-110'
                            }`} 
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-sm">tag</span>
                        <input
                          ref={tagInputRef}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                          placeholder="Enter tag name..."
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-gray-900 dark:text-white transition-all shadow-inner"
                        />
                      </div>
                      <button
                        onClick={() => handleAddTag(tagInput)}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-1 shrink-0 active:scale-95"
                      >
                         <span className="material-symbols-outlined text-sm">add</span>
                         <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          
          <button 
            onClick={onToggleAiPanel}
            className={`transition-colors p-2 rounded-lg flex items-center gap-2 ${
              aiPanelOpen ? 'text-primary bg-primary/10 font-bold' : 'text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={aiPanelOpen ? "Hide AI Assistant" : "Show AI Assistant"}
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span className="sr-only">{aiPanelOpen ? 'Hide AI' : 'AI Assistant'}</span>
          </button>
          
          <button className="text-gray-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {/* Container for editors - Removed max-width constraints and reduced padding for full width usage */}
        <div className={`h-full w-full ${activeMode === 'Mind Map' || activeMode === 'Drawio' ? 'p-0' : 'p-4'} overflow-hidden`}>
          <div className="h-full w-full">
            {renderEditor()}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Editor;
