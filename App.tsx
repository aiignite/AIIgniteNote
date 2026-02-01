
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, ViewState, NoteType } from './types';
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
  console.log('[apiNoteToLocalNote] Converting note:', JSON.stringify(apiNote, null, 2));

  // Convert backend note type to frontend note type
  let noteType: NoteType;
  const backendType = apiNote.noteType || apiNote.type;
  console.log('[apiNoteToLocalNote] Backend note type:', backendType);

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
      console.warn('[apiNoteToLocalNote] Unknown note type, defaulting to Markdown:', backendType);
      noteType = 'Markdown';
  }

  console.log('[apiNoteToLocalNote] Frontend note type:', noteType);

  // Ensure content is always a string
  let content: string;
  console.log('[apiNoteToLocalNote] Content type:', typeof apiNote.content);
  console.log('[apiNoteToLocalNote] Content value:', apiNote.content);

  if (typeof apiNote.content === 'object' && apiNote.content?.content !== undefined) {
    content = String(apiNote.content.content);
    console.log('[apiNoteToLocalNote] Extracted content from nested object:', content.substring(0, 50));
  } else if (typeof apiNote.content === 'string') {
    content = apiNote.content;
    console.log('[apiNoteToLocalNote] Using string content directly:', content.substring(0, 50));
  } else {
    content = '';
    console.warn('[apiNoteToLocalNote] Content is not valid, using empty string. Type:', typeof apiNote.content);
  }

  // Extract folder
  const folder = apiNote.folder?.name || 'General';
  const folderId = apiNote.folder?.id || apiNote.folderId || undefined;
  console.log('[apiNoteToLocalNote] Folder:', folder, '(folder object:', apiNote.folder, ')');

  // Extract tags
  const tags = apiNote.tags?.map((t: any) => {
    const tagObj = t.tag || t;
    return {
      name: tagObj.name,
      color: tagObj.color || '#6b7280'
    };
  }).filter((tag: any) => typeof tag.name === 'string') || [];
  console.log('[apiNoteToLocalNote] Tags:', tags, '(tags array:', apiNote.tags, ')');

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

  console.log('[apiNoteToLocalNote] Converted note:', JSON.stringify(result, null, 2));

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

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);

  // AI Panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // Resize State
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  const { primaryColor, getTheme, initialize: initTheme } = useThemeStore();
  const { t, language, initialize: initLanguage } = useLanguageStore();

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

      console.log('[loadNotes] API Response:', response);
      console.log('[loadNotes] Response.success:', response.success);
      console.log('[loadNotes] Response.data type:', typeof response.data);
      console.log('[loadNotes] Response.data is Array:', Array.isArray(response.data));
      console.log('[loadNotes] Response.data length:', response.data?.length);

      if (response.success) {
        console.log('[loadNotes] Processing notes data...');
        const localNotes = response.data.map(apiNoteToLocalNote);
        console.log('[loadNotes] Converted notes:', localNotes);
        console.log('[loadNotes] Notes count:', localNotes.length);
        console.log('[loadNotes] Setting notes state...');

        setNotes(localNotes);

        // Sync to IndexedDB using clear-and-replace to ensure deleted notes are removed
        try {
          await indexedDB.clearAndCacheNotes(localNotes);
          console.log('[loadNotes] Notes synced to IndexedDB:', localNotes.length);
        } catch (cacheError) {
          console.warn('[loadNotes] Failed to sync notes to IndexedDB:', cacheError);
        }

        // Select first note if none selected
        if (!selectedNoteId && localNotes.length > 0) {
          console.log('[loadNotes] Auto-selecting first note:', localNotes[0].id);
          setSelectedNoteId(localNotes[0].id);
        } else {
          console.log('[loadNotes] No notes to auto-select or note already selected');
        }
      } else {
        console.error('[loadNotes] Response.success is false:', response);
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

  // Handle template application
  const handleTemplateApplied = useCallback(async (noteId: string) => {
    console.log('[handleTemplateApplied] Template applied, note ID:', noteId);
    
    try {
      // Reload notes to get the newly created note
      await loadNotes();
      
      // Switch to editor view and select the note
      setCurrentView('editor');
      setSelectedNoteId(noteId);
      
      console.log('[handleTemplateApplied] Switched to editor view with note:', noteId);
    } catch (error) {
      console.error('[handleTemplateApplied] Error:', error);
    }
  }, [loadNotes]);

  // Handle adding a note from template
  const handleAddNoteFromTemplate = useCallback(async (templateId: string, folder?: string) => {
    if (!isAuthenticated) return;

    console.log('[handleAddNoteFromTemplate] Creating note from template:', { templateId, folder });

    try {
      const response = await api.applyTemplate(templateId, { 
        folderId: folder ? undefined : undefined // API will handle folder mapping
      }) as { success: boolean; data: any };

      if (response.success && response.data) {
        console.log('[handleAddNoteFromTemplate] Note created:', response.data);
        
        // Reload notes to get the newly created note
        await loadNotes();
        
        // Switch to editor view and select the note
        setCurrentView('editor');
        setSelectedNoteId(response.data.id);
        
        console.log('[handleAddNoteFromTemplate] Switched to editor view with note:', response.data.id);
      }
    } catch (error) {
      console.error('[handleAddNoteFromTemplate] Error:', error);
      alert('Failed to create note from template');
    }
  }, [isAuthenticated, loadNotes]);

  const handleAddNote = useCallback(async (type: NoteType = 'Markdown', folderId?: string) => {
    if (!isAuthenticated) return;

    const targetFolder = folderId ? folders.find(f => f.id === folderId) : undefined;
    const folderName = targetFolder?.name || 'General';

    console.log('[handleAddNote] Starting note creation:', { type, folderId, folderName, currentNotesCount: notes.length });

    try {
      const response = await api.createNote({
        title: `New ${type} Note`,
        noteType: frontendTypeToBackendType(type) as any,
        content: '',
        folderId,
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

        console.log('[App] handleUpdateNote - API response.success true:', {
          noteId: updatedNote.id,
          responseData: response.data,
          responseDataContent: response.data?.content,
          responseDataContentType: typeof response.data?.content,
          apiUpdatedNoteContent: apiUpdatedNote.content,
          apiUpdatedNoteContentType: typeof apiUpdatedNote.content
        });

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
    document.documentElement.style.setProperty('--color-primary', theme.rgb);
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
              onDeleteNote={handleDeleteNote}
              onUpdateNote={handleUpdateNote}
              onToggleFavorite={handleToggleFavorite}
              width={leftPanelWidth}
              loading={notesLoading}
              error={notesError}
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
        syncStatus={renderSyncStatus()}
      />

      <div className="flex-1 flex overflow-hidden">
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
