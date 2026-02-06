
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, ViewState, NoteType, AITemplate } from './types';
import { api, Note as ApiNote, Folder } from './services/api';
import { offlineSync } from './services/offlineSync';
import { indexedDB } from './services/indexedDB';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import AIPanel from './components/AIPanel';
import TemplateGallery from './components/TemplateGallery';
import Settings from './components/Settings';
import AIDashboard from './components/AIDashboard';
import LoginPage from './components/LoginPage';
import { Chat } from './components/Chat';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './store/languageStore';
import { useAuthStore } from './store/authStore';

// Convert frontend NoteType to backend note type enum
const frontendTypeToBackendType = (noteType: NoteType): string => {
  switch (noteType) {
    case 'Markdown':
      return 'MARKDOWN';
    case 'Rich Text':
      return 'RICHTEXT';
    case 'Mind Map':
      return 'MINDMAP';
    case 'Drawio':
      return 'FLOWCHART';
    default:
      return 'MARKDOWN';
  }
};

// Convert API Note to local Note type
const apiNoteToLocalNote = (apiNote: any): Note => {
  // Convert backend note type to frontend note type
  let noteType: NoteType;
  const backendType = apiNote.noteType || apiNote.type;

  switch (backendType) {
    case 'MARKDOWN':
      noteType = 'Markdown';
      break;
    case 'RICHTEXT':
      noteType = 'Rich Text';
      break;
    case 'MINDMAP':
      noteType = 'Mind Map';
      break;
    case 'FLOWCHART':
      noteType = 'Drawio';
      break;
    default:
      noteType = 'Markdown';
  }

  // Ensure content is always a string
  let content: string;

  if (typeof apiNote.content === 'object' && apiNote.content?.content !== undefined) {
    content = String(apiNote.content.content);
  } else if (typeof apiNote.content === 'string') {
    content = apiNote.content;
  } else {
    content = '';
  }

  // Extract folder
  const folder = apiNote.folder?.name || 'General';
  const folderId = apiNote.folder?.id || apiNote.folderId || undefined;

  // Extract tags
  const tags = apiNote.tags?.map((t: any) => {
    const tagObj = t.tag || t;
    return {
      name: tagObj.name,
      color: tagObj.color || '#6b7280'
    };
  }).filter((tag: any) => typeof tag.name === 'string') || [];

  const result: Note = {
    id: apiNote.id,
    title: apiNote.title,
    content,
    type: noteType,
    updatedAt: apiNote.updatedAt,
    createdAt: apiNote.createdAt,
    timestamp: new Date(apiNote.updatedAt).getTime(),
    folder,
    folderId,
    tags,
    isFavorite: apiNote.isFavorite || false,
  };

  return result;
};

const App: React.FC = () => {
  // Authentication state
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser, isAuthenticated, setIsAuthenticated } = useAuthStore();
  const [verificationMessage, setVerificationMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<ViewState>('editor');

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);

  // AI Panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  // 编辑器ref，用于AI面板调用编辑器方法
  const editorRef = useRef<any>(null);
  // 导入AI内容到编辑器的函数引用
  const importToEditorRef = useRef<((content: string, mode: 'replace' | 'insert' | 'append') => void) | null>(null);

  // Resize State
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  const { primaryColor, getTheme, initialize: initTheme } = useThemeStore();
  const { t, language, initialize: initLanguage } = useLanguageStore();
  const previousView = useRef<ViewState>('editor');

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('[initializeApp] Starting...');

    try {
      setIsLoading(true);

      await Promise.all([
        initTheme(),
        initLanguage()
      ]);

      // Check for email verification token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const verifyToken = urlParams.get('token');
      // In a no-router setup, we can also check for verify-email in path or just the token param
      const isVerifyAction = window.location.pathname.includes('verify-email') || verifyToken;

      if (verifyToken) {
        console.log('[initializeApp] Verifying email...');
        try {
          const result = await api.verifyEmail(verifyToken);
          setVerificationMessage({ type: 'success', text: result.message || 'Email verified successfully! You can now log in.' });
          // Clear URL parameter without reloading
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (error: any) {
          console.error('[initializeApp] Verification failed:', error);
          setVerificationMessage({ type: 'error', text: error?.message || 'Verification failed' });
        }
      }

      // Check if user is authenticated
      const isAuth = await api.isAuthenticated();
      console.log('[initializeApp] Authentication check:', isAuth);

      if (isAuth) {
        console.log('[initializeApp] User is authenticated, fetching profile...');
        // Fetch user profile
        const profile = await api.getProfile() as { success: true; data: any };
        if (profile.success) {
          console.log('[initializeApp] Profile fetched:', profile.data);
          setUser(profile.data);
          setIsAuthenticated(true);

          console.log('[initializeApp] Initializing offline sync...');
          // Initialize offline sync (don't fail if it errors)
          try {
            await offlineSync.initialize();
          } catch (syncError) {
            console.warn('[initializeApp] Offline sync initialization failed, continuing without it:', syncError);
          }

          console.log('[initializeApp] Loading folders...');
          // Load folders (Notes will be loaded by the useEffect watching currentView)
          await loadFolders();
        }
      } else {
        console.log('[initializeApp] User is not authenticated');
      }
    } catch (error) {
      console.error('[initializeApp] Initialization error:', error);
      // If token is invalid, clear it
      if ((error as any).message?.includes('401') || (error as any).message?.includes('Unauthorized')) {
        console.warn('[initializeApp] Clearing invalid tokens');
      }
    } finally {
      console.log('[initializeApp] Initialization complete');
      setIsLoading(false);
    }
  };

  // Load notes from API
  const loadNotes = useCallback(async (includeDeleted: boolean = false) => {
    const isAuth = await api.isAuthenticated();
    console.log('[loadNotes] Starting...', { isAuth, selectedNoteId, includeDeleted });

    try {
      setNotesLoading(true);
      setNotesError(null);

      console.log('[loadNotes] Calling api.getNotes()...');
      const response = await api.getNotes({ isDeleted: includeDeleted }) as { success: boolean; data: ApiNote[] };

      if (response.success) {
        const localNotes = response.data.map(apiNoteToLocalNote);

        setNotes(localNotes);

        // Sync to IndexedDB using clear-and-replace to ensure deleted notes are removed
        try {
          await indexedDB.clearAndCacheNotes(localNotes);
        } catch (cacheError) {
          console.warn('[loadNotes] Failed to sync notes to IndexedDB:', cacheError);
        }

        // Select first note if none selected
        if (!selectedNoteId && localNotes.length > 0) {
          setSelectedNoteId(localNotes[0].id);
        }
      } else {
        setNotesError('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('[loadNotes] Error:', error);
      console.error('[loadNotes] Error type:', error?.constructor?.name);
      console.error('[loadNotes] Error message:', error?.message);
      console.error('[loadNotes] Error stack:', error?.stack);

      let errorMessage = 'Failed to load notes';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setNotesError(errorMessage);

      // Try to load from IndexedDB cache
      try {
        console.log('[loadNotes] Attempting to load from IndexedDB cache...');
        const cachedNotes = await (await import('./services/indexedDB')).indexedDB.getNotes();
        console.log('[loadNotes] Cached notes from IndexedDB:', cachedNotes);
        console.log('[loadNotes] Cached notes count:', cachedNotes.length);

        if (cachedNotes.length > 0) {
          console.log('[loadNotes] Loading from cache...');
          const convertedCacheNotes = cachedNotes.map(apiNoteToLocalNote);
          console.log('[loadNotes] Converted cache notes:', convertedCacheNotes);
          setNotes(convertedCacheNotes);
          setNotesError(null);
          console.log('[loadNotes] Successfully loaded from cache');
        } else {
          console.log('[loadNotes] No cached notes available');
        }
      } catch (cacheError) {
        console.error('[loadNotes] Error loading from cache:', cacheError);
      }
    } finally {
      console.log('[loadNotes] Finished, setting notesLoading to false');
      setNotesLoading(false);
    }
  }, [selectedNoteId]);

  // Load notes when view changes (e.g., to Trash)
  useEffect(() => {
    if (isAuthenticated) {
      loadNotes(currentView === 'trash');
    }
  }, [currentView, isAuthenticated, loadNotes]);

  // Load folders from API
  const loadFolders = useCallback(async () => {
    const isAuth = await api.isAuthenticated();
    console.log('[loadFolders] Starting...', { isAuth });

    try {
      setFoldersLoading(true);
      setFoldersError(null);

      console.log('[loadFolders] Calling api.getFolders()...');
      const response = await api.getFolders() as { success: boolean; data: Folder[] };

      console.log('[loadFolders] API Response:', response);
      console.log('[loadFolders] Response.success:', response.success);
      console.log('[loadFolders] Response.data length:', response.data?.length);

      if (response.success) {
        console.log('[loadFolders] Processing folders data...');
        // Flatten the folder tree to a list
        const flattenFolders = (folderList: Folder[]): Folder[] => {
          const result: Folder[] = [];
          folderList.forEach(folder => {
            result.push(folder);
            if (folder.children && folder.children.length > 0) {
              result.push(...flattenFolders(folder.children));
            }
          });
          return result;
        };

        const flatFolders = flattenFolders(response.data);
        console.log('[loadFolders] Flattened folders:', flatFolders);
        console.log('[loadFolders] Total folders count:', flatFolders.length);
        setFolders(flatFolders);

        // Sync to IndexedDB using clear-and-replace to ensure deleted folders are removed
        try {
          await indexedDB.clearAndCacheFolders(flatFolders);
          console.log('[loadFolders] Folders synced to IndexedDB:', flatFolders.length);
        } catch (cacheError) {
          console.warn('[loadFolders] Failed to sync folders to IndexedDB:', cacheError);
        }
      } else {
        console.error('[loadFolders] Response.success is false:', response);
      }
    } catch (error) {
      console.error('[loadFolders] Error:', error);
      setFoldersError('Failed to load folders');
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  // Handle login
  const handleLogin = useCallback(async (email: string, password: string) => {
    console.log('[handleLogin] Starting login process...');

    try {
      const response = await api.login({ email, password });
      console.log('[handleLogin] Login successful:', response.user);
      setUser(response.user);
      setIsAuthenticated(true);

      console.log('[handleLogin] Initializing offline sync...');
      // Initialize offline sync (don't fail if it errors)
      try {
        await offlineSync.initialize();
      } catch (syncError) {
        console.warn('[handleLogin] Offline sync initialization failed, continuing without it:', syncError);
      }

      console.log('[handleLogin] Loading folders...');
      // Load folders (Notes will be loaded by the useEffect)
      await loadFolders();

      console.log('[handleLogin] Login process complete');
      return { success: true };
    } catch (error) {
      console.error('[handleLogin] Error:', error);
      throw error; // Throw so LoginPage can catch it
    }
  }, [loadNotes, loadFolders]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setNotes([]);
      setFolders([]);
      setSelectedNoteId(null);
      setCurrentView('editor');
    }
  }, []);

  // Handle register
  const handleRegister = useCallback(async (email: string, password: string, name: string) => {
    console.log('[handleRegister] Starting registration process...');

    try {
      const response = await api.register({ email, password, name });
      console.log('[handleRegister] Registration successful, verification required.');
      
      return { 
        success: true, 
        message: response.message || 'Registration successful. Please check your email to verify your account.' 
      };
    } catch (error: any) {
      console.error('[handleRegister] Registration error:', error);
      throw error;
    }
  }, []);

  const handleVerifyCode = useCallback(async (email: string, code: string) => {
    try {
      const response = await api.verifyEmailCode(email, code);
      return { success: true, message: response.message };
    } catch (error: any) {
      return { success: false, message: error?.message || '验证码校验失败' };
    }
  }, []);

  const handleResendCode = useCallback(async (email: string) => {
    try {
      const response = await api.resendVerificationCode(email);
      return { success: true, message: response.message };
    } catch (error: any) {
      return { success: false, message: error?.message || '验证码发送失败' };
    }
  }, []);

  // Handle add folder
  const handleAddFolder = useCallback(async (name: string, parentId?: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.createFolder({
        name,
        parentId,
      }) as { success: boolean; data: any };

      if (response.success) {
        console.log('Folder created successfully:', response.data);
        // Cache to IndexedDB
        try {
          await indexedDB.cacheFolder(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache folder to IndexedDB:', cacheError);
        }
        // Reload folders to show the new folder
        await loadFolders();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  }, [isAuthenticated, loadFolders]);

  // Handle delete folder
  const handleDeleteFolder = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.deleteFolder(id) as { success: boolean };
      if (response.success) {
        console.log('Folder deleted successfully:', id);
        // Remove from IndexedDB
        try {
          await indexedDB.removeFolder(id);
        } catch (cacheError) {
          console.warn('Failed to remove folder from IndexedDB:', cacheError);
        }
        // Remove notes in this folder from local state
        const deletedFolderName = folders.find(f => f.id === id)?.name;
        setNotes(prev => prev.filter(n => n.folderId !== id && n.folder !== deletedFolderName));
        // Reload folders
        await loadFolders();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    }
  }, [isAuthenticated, loadFolders, folders]);

  // Handle update folder
  const handleUpdateFolder = useCallback(async (id: string, name: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.updateFolder(id, { name }) as { success: boolean; data: any };
      if (response.success) {
        console.log('Folder updated successfully:', response.data);
        // Update IndexedDB cache
        try {
          await indexedDB.cacheFolder(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache updated folder to IndexedDB:', cacheError);
        }
        // Reload folders
        await loadFolders();
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      alert('Failed to update folder');
    }
  }, [isAuthenticated, loadFolders]);

  const handleMoveFolder = useCallback(async (id: string, parentId: string | null) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.updateFolder(id, { parentId: parentId || undefined }) as { success: boolean; data: any };
      if (response.success) {
        try {
          await indexedDB.cacheFolder(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache moved folder to IndexedDB:', cacheError);
        }
        await loadFolders();
      }
    } catch (error) {
      console.error('Error moving folder:', error);
      alert('Failed to move folder');
    }
  }, [isAuthenticated, loadFolders]);

  // Load templates for quick creation
  const loadTemplates = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setTemplatesLoading(true);
      setTemplatesError(null);

      // Read cached templates first for faster UI
      try {
        const cached = await indexedDB.getTemplates();
        if (cached?.length) {
          setTemplates(cached);
        }
      } catch (cacheErr) {
        console.warn('[loadTemplates] Failed to read cached templates:', cacheErr);
      }

      const response = await api.getTemplates() as { success: boolean; data: AITemplate[] };
      if (response.success) {
        const templateList = response.data || [];
        setTemplates(templateList);

        try {
          await indexedDB.cacheTemplates(templateList);
        } catch (cacheErr) {
          console.warn('[loadTemplates] Failed to cache templates:', cacheErr);
        }
      }
    } catch (error: any) {
      console.error('[loadTemplates] Error loading templates:', error);
      setTemplatesError(error?.message || 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, [isAuthenticated]);

  // Load templates once authenticated and refresh when returning from templates view
  useEffect(() => {
    if (!isAuthenticated) return;
    loadTemplates();
  }, [isAuthenticated, loadTemplates]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (previousView.current === 'templates' && currentView !== 'templates') {
      loadTemplates();
    }
    previousView.current = currentView;
  }, [currentView, isAuthenticated, loadTemplates]);

  useEffect(() => {
    if (templatesError) {
      console.warn('[App] Template load warning:', templatesError);
    }
  }, [templatesError]);

  // Handle template application (from TemplateGallery card click)
  const handleTemplateApplied = useCallback(async (noteId: string) => {
    console.log('[handleTemplateApplied] Template applied, note ID:', noteId);
    
    try {
      // Reload notes to get the newly created note
      await loadNotes();
      
      // Switch to editor view and select the note AFTER notes are loaded
      // Use setTimeout to ensure state has been updated
      setTimeout(() => {
        setCurrentView('editor');
        setSelectedNoteId(noteId);
        console.log('[handleTemplateApplied] Selected note ID set to:', noteId);
      }, 100);
    } catch (error) {
      console.error('[handleTemplateApplied] Error:', error);
    }
  }, [loadNotes]);

  // Handle adding a note from template (from NoteList dropdown)
  const handleAddNoteFromTemplate = useCallback(async (templateId: string, folderId?: string | null) => {
    if (!isAuthenticated) return;

    // Ensure folderId is either a valid UUID string or undefined
    const validFolderId = folderId && folderId.length > 0 ? folderId : undefined;

    console.log('[handleAddNoteFromTemplate] Creating note from template:', { templateId, folderId: validFolderId });

    try {
      const response = await api.applyTemplate(templateId, { 
        folderId: validFolderId
      }) as { success: boolean; data: any };

      if (response.success && response.data) {
        console.log('[handleAddNoteFromTemplate] Note created:', response.data);
        
        const newNote = apiNoteToLocalNote(response.data);
        
        // Add to local state immediately (like handleAddNote does)
        setNotes(prev => [newNote, ...prev]);
        
        // Switch to editor view and select the note
        setCurrentView('editor');
        setSelectedNoteId(newNote.id);
        console.log('[handleAddNoteFromTemplate] Selected note ID set to:', newNote.id);
        
        // Cache to IndexedDB
        try {
          await indexedDB.cacheNote(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache note to IndexedDB:', cacheError);
        }
      }
    } catch (error) {
      console.error('[handleAddNoteFromTemplate] Error:', error);
      alert('Failed to create note from template');
    }
  }, [isAuthenticated]);

  const handleAddNote = useCallback(async (type: NoteType = 'Markdown', folderId?: string | null) => {
    if (!isAuthenticated) return;

    // Ensure folderId is either a valid UUID string or undefined
    const validFolderId = folderId && folderId.length > 0 ? folderId : undefined;
    const targetFolder = validFolderId ? folders.find(f => f.id === validFolderId) : undefined;
    const folderName = targetFolder?.name || 'General';

    console.log('[handleAddNote] Starting note creation:', { type, folderId: validFolderId, folderName, currentNotesCount: notes.length });

    try {
      const response = await api.createNote({
        title: `New ${type} Note`,
        noteType: frontendTypeToBackendType(type) as any,
        content: '',
        folderId: validFolderId,
      }) as { success: boolean; data: ApiNote };

      if (response.success) {
        const newNote = apiNoteToLocalNote(response.data);

        console.log('[handleAddNote] Note created successfully:', {
          newNoteId: newNote.id,
          newNoteTitle: newNote.title,
          newNoteType: newNote.type,
          newNoteContent: newNote.content
        });

        // Update local state
        setNotes(prev => {
          const updated = [newNote, ...prev];
          console.log('[handleAddNote] Notes state updated:', {
            beforeCount: prev.length,
            afterCount: updated.length,
            firstNoteId: updated[0].id
          });
          return updated;
        });

        setSelectedNoteId(newNote.id);
        console.log('[handleAddNote] Selected note ID set to:', newNote.id);

        setCurrentView('editor');
        console.log('[handleAddNote] View set to editor');

        // Reload folders to update note counts
        await loadFolders();

        // Cache to IndexedDB (don't fail if caching fails)
        try {
          await indexedDB.cacheNote(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache note to IndexedDB:', cacheError);
        }
      }
    } catch (error) {
      console.error('Error creating note:', error);

      // Check if it's a network error - if so, add to offline queue
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        // Create temporary note for local use
        const tempNote: Note = {
          id: `temp_${Date.now()}`,
          title: `New ${type} Note`,
          content: '',
          type,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          timestamp: Date.now(),
          folder: folderName,
          folderId,
          tags: [],
        };

        // Add to local state
        setNotes(prev => [tempNote, ...prev]);
        setSelectedNoteId(tempNote.id);
        setCurrentView('editor');

        // Enqueue for later sync
        try {
          await offlineSync.enqueueRequest('POST', '/api/notes', {
            title: tempNote.title,
            noteType: frontendTypeToBackendType(type),
            content: tempNote.content,
            folderId,
          });
        } catch (queueError) {
          console.warn('Failed to enqueue note creation:', queueError);
        }
      } else {
        setNotesError('Failed to create note');
      }
    }
  }, [isAuthenticated, folders, loadFolders]);

  // Handle update note
  const handleUpdateNote = useCallback(async (updatedNote: Note) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.updateNote(updatedNote.id, {
        title: updatedNote.title,
        content: updatedNote.content,
        folderId: updatedNote.folderId,
        tags: updatedNote.tags,
      }) as { success: boolean; data: ApiNote };

      if (response.success) {
        const apiUpdatedNote = apiNoteToLocalNote(response.data);

        // Update local state
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? apiUpdatedNote : n));

        // Update IndexedDB cache (don't fail if caching fails)
        try {
          await indexedDB.cacheNote(response.data);
        } catch (cacheError) {
          console.warn('Failed to cache updated note to IndexedDB:', cacheError);
        }
      }
    } catch (error) {
      console.error('Error updating note:', error);

      // Check if it's a network error - if so, add to offline queue
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        // Update local state optimistically
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));

        // Enqueue for later sync
        try {
          await offlineSync.enqueueRequest('PUT', `/api/notes/${updatedNote.id}`, {
            title: updatedNote.title,
            content: updatedNote.content,
            folderId: updatedNote.folderId,
            tags: updatedNote.tags,
          });
        } catch (queueError) {
          console.warn('Failed to enqueue note update:', queueError);
        }
      } else {
        setNotesError('Failed to update note');
      }
    }
  }, [isAuthenticated]);

  // Handle delete note
  const handleDeleteNote = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    try {
      await api.deleteNote(id);

      // Update local state
      setNotes(prev => {
        const newNotes = prev.filter(n => n.id !== id);
        if (selectedNoteId === id && newNotes.length > 0) {
          setSelectedNoteId(newNotes[0].id);
        } else if (newNotes.length === 0) {
          setSelectedNoteId(null);
        }
        return newNotes;
      });

      // Remove from IndexedDB (don't fail if deletion fails)
      try {
        await indexedDB.removeNote(id);
      } catch (cacheError) {
        console.warn('Failed to remove note from IndexedDB:', cacheError);
      }
    } catch (error) {
      console.error('Error deleting note:', error);

      // Check if it's a network error - if so, add to offline queue
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        // Optimistically remove from local state
        setNotes(prev => {
          const newNotes = prev.filter(n => n.id !== id);
          if (selectedNoteId === id && newNotes.length > 0) {
            setSelectedNoteId(newNotes[0].id);
          } else if (newNotes.length === 0) {
            setSelectedNoteId(null);
          }
          return newNotes;
        });

        // Enqueue for later sync
        try {
          await offlineSync.enqueueRequest('DELETE', `/api/notes/${id}`, undefined);
        } catch (queueError) {
          console.warn('Failed to enqueue note deletion:', queueError);
        }
      } else {
        setNotesError('Failed to delete note');
      }
    }
  }, [isAuthenticated, selectedNoteId]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.toggleFavoriteNote(id) as { success: boolean; data: any };
      if (response.success) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n));
        
        // Update IndexedDB cache
        const updatedNote = notes.find(n => n.id === id);
        if (updatedNote) {
           // We'd ideally have the full note object from API or construct it
           // For now, local update is enough as it will re-sync
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [isAuthenticated, notes]);

  // Monitor sync status
  useEffect(() => {
    const checkSyncStatus = async () => {
      const isOnline = offlineSync.isNetworkOnline();
      const queueStatus = await offlineSync.getQueueStatus();

      if (!isOnline) {
        setSyncStatus('offline');
      } else if (queueStatus.total > 0) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('synced');
      }
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Apply theme color to CSS variables whenever primaryColor changes
  useEffect(() => {
    const theme = getTheme();
    const root = document.documentElement;
    
    console.log('Theme changed to:', primaryColor, 'palette[600]:', theme.palette[600]);
    
    // 设置 :root 中定义的 --theme-primary 变量，这些变量被 @theme inline 引用
    root.style.setProperty('--theme-primary', theme.palette[600]);
    root.style.setProperty('--theme-primary-50', theme.palette[50]);
    root.style.setProperty('--theme-primary-100', theme.palette[100]);
    root.style.setProperty('--theme-primary-200', theme.palette[200]);
    root.style.setProperty('--theme-primary-300', theme.palette[300]);
    root.style.setProperty('--theme-primary-400', theme.palette[400]);
    root.style.setProperty('--theme-primary-500', theme.palette[500]);
    root.style.setProperty('--theme-primary-600', theme.palette[600]);
    root.style.setProperty('--theme-primary-700', theme.palette[700]);
    root.style.setProperty('--theme-primary-800', theme.palette[800]);
    root.style.setProperty('--theme-primary-900', theme.palette[900]);
    
    // 验证设置是否成功
    console.log('CSS variable --theme-primary set to:', getComputedStyle(root).getPropertyValue('--theme-primary'));
  }, [primaryColor, getTheme]);

  // Handle Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = e.clientX - 64;
        if (newWidth >= 250 && newWidth <= 600) {
          setLeftPanelWidth(newWidth);
        }
      }
      if (isDraggingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 300 && newWidth <= 800) {
          setRightPanelWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDraggingLeft, isDraggingRight]);

  const activeNote = notes.find(n => n.id === selectedNoteId) || null;

  // Show loading screen
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onVerifyCode={handleVerifyCode}
        onResendCode={handleResendCode}
        externalMessage={verificationMessage}
      />
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'ai-dashboard':
        return <AIDashboard />;
      case 'templates':
        return <TemplateGallery onTemplateApplied={handleTemplateApplied} />;
      case 'settings':
        return <Settings user={user} />;
      case 'editor':
      case 'tags':
      case 'favorites':
      case 'trash':
      default:
        return (
          <div className="flex-1 flex overflow-hidden relative">
            <NoteList
              notes={notes}
              folders={folders}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onAddNote={handleAddNote}
              onAddNoteFromTemplate={handleAddNoteFromTemplate}
              onAddFolder={handleAddFolder}
              onDeleteFolder={handleDeleteFolder}
              onUpdateFolder={handleUpdateFolder}
              onMoveFolder={handleMoveFolder}
              onDeleteNote={handleDeleteNote}
              onUpdateNote={handleUpdateNote}
              onToggleFavorite={handleToggleFavorite}
              width={leftPanelWidth}
              loading={notesLoading}
              error={notesError}
              templates={templates}
              templatesLoading={templatesLoading}
              isTrashView={currentView === 'trash'}
              onRestoreNote={async (id) => {
                await api.restoreNote(id);
                await loadNotes(currentView === 'trash');
              }}
            />
            {/* Left Resizer */}
            <div
              className={`w-1 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0 z-20 ${isDraggingLeft ? 'bg-primary' : 'bg-transparent'}`}
              onMouseDown={() => setIsDraggingLeft(true)}
              title="Drag to resize list"
            />
            <Editor 
              note={activeNote} 
              onUpdateNote={handleUpdateNote} 
              aiPanelOpen={aiPanelOpen}
              onToggleAiPanel={() => setAiPanelOpen(!aiPanelOpen)}
              onEditorRefChange={(ref) => { editorRef.current = ref?.current; }}
            />
          </div>
        );
    }
  };

  // Sync status indicator
  const renderSyncStatus = () => {
    const colors = {
      synced: 'bg-green-500',
      syncing: 'bg-yellow-500',
      offline: 'bg-gray-500',
      error: 'bg-red-500',
    };

    const labels = {
      synced: t.noteList.cloudSynced || 'Synced',
      syncing: language === 'en' ? 'Syncing...' : '同步中...',
      offline: language === 'en' ? 'Offline' : '离线',
      error: language === 'en' ? 'Sync Error' : '同步错误',
    };

    const descriptions = {
      synced: language === 'en' ? 'All data is synced to cloud' : '所有数据已同步至云端',
      syncing: language === 'en' ? 'Syncing data to server...' : '正在同步数据到服务器...',
      offline: language === 'en' ? 'Working offline, data will sync when online' : '离线模式，数据将在上线后同步',
      error: language === 'en' ? 'Error syncing data to server' : '同步数据到服务器时出错',
    };

    return (
      <div 
        className="flex items-center gap-2 text-[10px] text-text-secondary-light dark:text-text-secondary-dark cursor-help"
        title={descriptions[syncStatus]}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${colors[syncStatus]}`} />
        <span>{labels[syncStatus]}</span>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden h-full">
        {renderContent()}

        {isAuthenticated && <Chat />}

        {currentView === 'editor' && aiPanelOpen && (
          <>
            {/* Right Resizer */}
            <div
              className={`w-1 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0 z-20 ${isDraggingRight ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'}`}
              onMouseDown={() => setIsDraggingRight(true)}
              title="Drag to resize AI Panel"
            />
            <AIPanel
              activeNote={activeNote}
              onClose={() => setAiPanelOpen(false)}
              width={rightPanelWidth}
              editorRef={editorRef}
              onImportToEditor={(content, mode) => {
                // 直接调用编辑器的导入方法
                if (editorRef.current) {
                  if (mode === 'replace' && editorRef.current.replaceContent) {
                    editorRef.current.replaceContent(content);
                  } else if (editorRef.current.insertContent) {
                    editorRef.current.insertContent(content, mode === 'append' ? 'end' : 'cursor');
                  }
                }
              }}
            />
          </>
        )}

        {/* Floating bottom-right AI toggle button removed.
            Top editor button now exclusively controls showing/hiding the AI panel.
            If you later want to re-enable this shortcut, restore the block here. */}
      </div>
    </div>
  );
};

export default App;
