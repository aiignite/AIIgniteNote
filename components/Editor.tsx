
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, NoteType } from '../types';
import MarkdownEditor from './editors/MarkdownEditor';
import RichTextEditor from './editors/RichTextEditor';
import MindMapEditor from './editors/MindMapEditor';
import DrawioEditor from './editors/DrawioEditor';
import { useLanguageStore } from '../store/languageStore';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (updatedNote: Note) => void;
}

const Editor: React.FC<EditorProps> = ({ note, onUpdateNote }) => {
  const [activeMode, setActiveMode] = useState<NoteType>('Markdown');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local title state to prevent overwrites from API responses
  const [localTitle, setLocalTitle] = useState(note?.title || '');

  const { t } = useLanguageStore();

  // Tag Menu State
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Debounced update ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<Note> | null>(null);

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
    setIsSaving(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (pendingUpdateRef.current && note) {
        console.log('[Editor] Triggering onUpdateNote after debounce:', {
          pendingUpdates: pendingUpdateRef.current,
          finalContent: pendingUpdateRef.current.content,
          finalContentLength: pendingUpdateRef.current.content?.length || 0
        });
        onUpdateNote({ ...note, ...pendingUpdateRef.current });
        pendingUpdateRef.current = null;
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
    if (trimmed && !note.tags.includes(trimmed)) {
      immediateUpdate({ tags: [...note.tags, trimmed] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    immediateUpdate({ tags: note.tags.filter(t => t !== tagToRemove) });
  };

  const handleToggleTag = (tag: string) => {
    if (note.tags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  };

  const suggestedTags = ['Important', 'Work', 'Personal', 'Draft', 'To Do', 'Ideas'];

  const renderEditor = () => {
    switch (activeMode) {
      case 'Markdown':
        return <MarkdownEditor value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
      case 'Rich Text':
        return <RichTextEditor value={note.content} onChange={handleContentChange} />;
      case 'Mind Map':
        return <MindMapEditor value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
      case 'Drawio':
        return <DrawioEditor value={note.content} onChange={handleContentChange} darkMode={isDarkMode} />;
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
          }`}>
            <span className={`material-symbols-outlined text-[14px] ${isSaving ? 'animate-spin' : ''}`}>
              {isSaving ? 'autorenew' : 'check_circle'}
            </span>
            <span className="hidden sm:inline">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>

          {/* Tag List Display */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[200px] scrollbar-hide">
            {note.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 flex items-center justify-center">
                   <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </span>
            ))}
          </div>

          {/* Tag Dropdown Menu */}
          <div className="relative" ref={tagMenuRef}>
            <button 
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
               <span className="material-symbols-outlined text-sm">label</span>
               <span className="hidden sm:inline">{t.editor.addTag}</span>
            </button>

            {showTagMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                  placeholder="Type & Enter to create..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border-none rounded-lg mb-2 focus:ring-1 focus:ring-primary text-gray-900 dark:text-white"
                />
                
                <div className="max-h-48 overflow-y-auto scrollbar-hide">
                   <p className="text-[9px] font-bold text-gray-400 uppercase px-2 mb-1.5 mt-1">{t.editor.suggested}</p>
                   <div className="space-y-0.5">
                     {suggestedTags.map(t => (
                       <button
                         key={t}
                         onClick={() => handleToggleTag(t)}
                         className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between group transition-colors ${
                           note.tags.includes(t) 
                             ? 'bg-primary/10 text-primary font-medium' 
                             : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                         }`}
                       >
                         {t}
                         {note.tags.includes(t) && <span className="material-symbols-outlined text-xs">check</span>}
                       </button>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          
          <span className="text-xs text-gray-400 whitespace-nowrap min-w-[60px] text-right">
             {note.content.length} {t.editor.chars}
          </span>
          
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
