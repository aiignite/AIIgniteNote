/**
 * IndexedDB Cache Service for AI Ignite Note
 * Provides offline data storage and synchronization
 */

const DB_NAME = 'AIIgniteNoteDB';
const DB_VERSION = 7;  // Incremented for AI_MODELS store

// Store names
export const STORES = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  TAGS: 'tags',
  WORKSPACES: 'workspaces',
  TEMPLATES: 'templates',
  ATTACHMENTS: 'attachments',
  SETTINGS: 'settings',
  AI_CONVERSATIONS: 'ai_conversations',
  AI_FAVORITES: 'ai_favorites',
  AI_PROMPTS: 'ai_prompts',
  AI_SETTINGS: 'ai_settings',
  AI_ASSISTANTS: 'ai_assistants',
  AI_MODELS: 'ai_models',
  AI_DRAFTS: 'ai_drafts',
  OFFLINE_QUEUE: 'offline_queue',
} as const;

// Cache item metadata
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  synced: boolean;
}

// Offline queue item
export interface QueueItem {
  id: string;
  method: string;
  url: string;
  body?: any;
  timestamp: number;
  retries: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private isAvailable: boolean = true;
  private initPromise: Promise<void> | null = null;

  // Check if IndexedDB is available
  private checkAvailable(): boolean {
    if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
      this.isAvailable = false;
      return false;
    }
    return true;
  }

  // Initialize database
  async init(): Promise<void> {
    // Return cached promise if init is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Check if IndexedDB is available
    if (!this.checkAvailable()) {
      console.warn('IndexedDB is not available in this environment');
      return Promise.resolve();
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('Failed to open IndexedDB, falling back to API-only mode');
          this.isAvailable = false;
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object stores
          if (!db.objectStoreNames.contains(STORES.NOTES)) {
            const notesStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
            notesStore.createIndex('folderId', 'folderId', { unique: false });
            notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
            const foldersStore = db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
            foldersStore.createIndex('parentId', 'parentId', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.TAGS)) {
            db.createObjectStore(STORES.TAGS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
            db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
            const templatesStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
            templatesStore.createIndex('category', 'category', { unique: false });
            templatesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.AI_CONVERSATIONS)) {
            const conversationsStore = db.createObjectStore(STORES.AI_CONVERSATIONS, { keyPath: 'id' });
            conversationsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
            const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
            const attachmentsStore = db.createObjectStore(STORES.ATTACHMENTS, { keyPath: 'id' });
            attachmentsStore.createIndex('noteId', 'noteId', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_FAVORITES)) {
            db.createObjectStore(STORES.AI_FAVORITES, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_PROMPTS)) {
            db.createObjectStore(STORES.AI_PROMPTS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_SETTINGS)) {
            db.createObjectStore(STORES.AI_SETTINGS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_ASSISTANTS)) {
            db.createObjectStore(STORES.AI_ASSISTANTS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_MODELS)) {
            db.createObjectStore(STORES.AI_MODELS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORES.AI_DRAFTS)) {
            db.createObjectStore(STORES.AI_DRAFTS, { keyPath: 'id' });
          }
        };
      } catch (error) {
        console.warn('IndexedDB initialization failed:', error);
        this.isAvailable = false;
        resolve();
      }
    });
  }

  // Generic get operation
  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.isAvailable) return null;
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.warn(`Failed to get item from ${storeName}`);
        resolve(null);
      };
    });
  }

  // Generic get all operation
  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.isAvailable) return [];
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.warn(`Failed to get all items from ${storeName}`);
        resolve([]);
      };
    });
  }

   // Generic put operation
  async put<T>(storeName: string, key: string, data: T, synced = true): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      console.log(`[IndexedDB.put] Putting item into ${storeName}:`, { key, dataType: typeof data });

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`[IndexedDB.put] Successfully put item into ${storeName}:`, key);
        resolve();
      };

      request.onerror = (event) => {
        console.error(`[IndexedDB.put] Failed to put item in ${storeName}:`, {
          key,
          error: (event.target as any).error,
          dataType: typeof data,
          dataKeys: Object.keys(data as any)
        });
        reject(new Error(`Failed to put item in ${storeName}: ${(event.target as any).error?.message}`));
      };
    });
  }

  // Generic delete operation
  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete item from ${storeName}`));
      };
    });
  }

  // Generic clear operation
  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear ${storeName}`));
      };
    });
  }

  // Notes specific methods
  async getNotes(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.NOTES);
    return items.filter(item => item !== undefined && item !== null);
  }

  async getNote(id: string): Promise<any | null> {
    const item = await this.get<any>(STORES.NOTES, id);
    return item ? item.data : null;
  }

  async cacheNotes(notes: any[]): Promise<void> {
    console.log('[IndexedDB.cacheNotes] Caching notes:', notes.length, 'items');
    for (const note of notes) {
      if (!note || typeof note !== 'object') {
        console.warn('[IndexedDB.cacheNotes] Skipping invalid note:', note);
        continue;
      }

      if (!note.id) {
        console.warn('[IndexedDB.cacheNotes] Skipping note without id:', note);
        continue;
      }

      try {
        await this.put(STORES.NOTES, note.id, note);
      } catch (error) {
        console.error('[IndexedDB.cacheNotes] Failed to cache note:', note.id, error);
      }
    }
    console.log('[IndexedDB.cacheNotes] Notes caching complete');
  }

  async cacheNote(note: any): Promise<void> {
    console.log('[IndexedDB.cacheNote] Caching note:', note.id);

    if (!note || typeof note !== 'object') {
      console.warn('[IndexedDB.cacheNote] Skipping invalid note:', note);
      return;
    }

    if (!note.id) {
      console.warn('[IndexedDB.cacheNote] Skipping note without id:', note);
      return;
    }

    try {
      await this.put(STORES.NOTES, note.id, note);
      console.log('[IndexedDB.cacheNote] Note cached successfully');
    } catch (error) {
      console.error('[IndexedDB.cacheNote] Failed to cache note:', note.id, error);
    }
  }

  async removeNote(id: string): Promise<void> {
    console.log('[IndexedDB.removeNote] Removing note:', id);
    await this.delete(STORES.NOTES, id);
  }

  // Folders specific methods
  async getFolders(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.FOLDERS);
    return items.filter(item => item !== undefined && item !== null);
  }

  async cacheFolders(folders: any[]): Promise<void> {
    console.log('[IndexedDB.cacheFolders] Caching folders:', folders.length, 'items');
    for (const folder of folders) {
      if (!folder || typeof folder !== 'object') {
        console.warn('[IndexedDB.cacheFolders] Skipping invalid folder:', folder);
        continue;
      }

      if (!folder.id) {
        console.warn('[IndexedDB.cacheFolders] Skipping folder without id:', folder);
        continue;
      }

      try {
        await this.put(STORES.FOLDERS, folder.id, folder);
      } catch (error) {
        console.error('[IndexedDB.cacheFolders] Failed to cache folder:', folder.id, error);
      }
    }
    console.log('[IndexedDB.cacheFolders] Folders caching complete');
  }

  async cacheFolder(folder: any): Promise<void> {
    if (folder && folder.id) {
      await this.put(STORES.FOLDERS, folder.id, folder);
    }
  }

  async removeFolder(id: string): Promise<void> {
    console.log('[IndexedDB.removeFolder] Removing folder:', id);
    await this.delete(STORES.FOLDERS, id);
  }

  // Tags specific methods
  async getTags(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.TAGS);
    return items.filter(item => item !== undefined && item !== null);
  }

  async cacheTags(tags: any[]): Promise<void> {
    for (const tag of tags) {
      await this.put(STORES.TAGS, tag.id, tag);
    }
  }

  async cacheTag(tag: any): Promise<void> {
    if (tag.id) {
      await this.put(STORES.TAGS, tag.id, tag);
    }
  }

  async removeTag(id: string): Promise<void> {
    await this.delete(STORES.TAGS, id);
  }

  async clearAndCacheTags(tags: any[]): Promise<void> {
    await this.clear(STORES.TAGS);
    await this.cacheTags(tags);
  }

  // Workspaces specific methods
  async getWorkspaces(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.WORKSPACES);
    return items.filter(item => item !== undefined && item !== null);
  }

  async cacheWorkspace(workspace: any): Promise<void> {
    await this.put(STORES.WORKSPACES, workspace.id, workspace);
  }

  async cacheWorkspaces(workspaces: any[]): Promise<void> {
    for (const workspace of workspaces) {
      await this.put(STORES.WORKSPACES, workspace.id, workspace);
    }
  }

  async removeWorkspace(id: string): Promise<void> {
    await this.delete(STORES.WORKSPACES, id);
  }

  async clearAndCacheWorkspaces(workspaces: any[]): Promise<void> {
    await this.clear(STORES.WORKSPACES);
    await this.cacheWorkspaces(workspaces);
  }

  // AI Conversations specific methods
  async getConversations(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.AI_CONVERSATIONS);
    return items.filter(item => item !== undefined && item !== null);
  }

  async cacheConversation(conversation: any): Promise<void> {
    await this.put(STORES.AI_CONVERSATIONS, conversation.id, conversation);
  }

  async removeConversation(id: string): Promise<void> {
    await this.delete(STORES.AI_CONVERSATIONS, id);
  }

  // Templates specific methods
  async getTemplates(): Promise<any[]> {
    const items = await this.getAll<any>(STORES.TEMPLATES);
    return items.filter(item => item !== undefined && item !== null);
  }

  async cacheTemplates(templates: any[]): Promise<void> {
    console.log('[IndexedDB.cacheTemplates] Caching templates:', templates.length, 'items');
    for (const template of templates) {
      if (!template || !template.id) continue;
      try {
        await this.put(STORES.TEMPLATES, template.id, template);
      } catch (error) {
        console.error('[IndexedDB.cacheTemplates] Failed to cache template:', template.id, error);
      }
    }
  }

  async cacheTemplate(template: any): Promise<void> {
    if (!template || !template.id) return;
    await this.put(STORES.TEMPLATES, template.id, template);
  }

  async removeTemplate(id: string): Promise<void> {
    await this.delete(STORES.TEMPLATES, id);
  }

  async getSettings(): Promise<any | null> {
    return await this.get<any>(STORES.SETTINGS, 'current');
  }

  async cacheSettings(settings: any): Promise<void> {
    await this.put(STORES.SETTINGS, 'current', { ...settings, id: 'current' });
  }

  async getAuthTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    return await this.get<{ accessToken: string; refreshToken: string }>(STORES.SETTINGS, 'auth');
  }

  async cacheAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.put(STORES.SETTINGS, 'auth', { id: 'auth', accessToken, refreshToken });
  }

  async clearAuthTokens(): Promise<void> {
    await this.delete(STORES.SETTINGS, 'auth');
  }

  async getAttachments(noteId?: string): Promise<any[]> {
    if (noteId) {
      const all = await this.getAll<any>(STORES.ATTACHMENTS);
      return all.filter(a => a.noteId === noteId);
    }
    return await this.getAll<any>(STORES.ATTACHMENTS);
  }

  async cacheAttachments(attachments: any[]): Promise<void> {
    for (const attachment of attachments) {
      if (attachment.id) {
        await this.put(STORES.ATTACHMENTS, attachment.id, attachment);
      }
    }
  }

  async removeAttachment(id: string): Promise<void> {
    await this.delete(STORES.ATTACHMENTS, id);
  }

  async getAISettings(): Promise<any | null> {
    const settings = await this.getAll<any>(STORES.AI_SETTINGS);
    return settings.length > 0 ? settings[0] : null;
  }

  async cacheAISettings(settings: any): Promise<void> {
    await this.put(STORES.AI_SETTINGS, 'current', { ...settings, id: 'current' });
  }

  async getAIPrompts(): Promise<any[]> {
    return await this.getAll<any>(STORES.AI_PROMPTS);
  }

  async cacheAIPrompts(prompts: any[]): Promise<void> {
    for (const prompt of prompts) {
      if (prompt.id) {
        await this.put(STORES.AI_PROMPTS, prompt.id, prompt);
      }
    }
  }

  async cacheAIPrompt(prompt: any): Promise<void> {
    if (prompt.id) {
      await this.put(STORES.AI_PROMPTS, prompt.id, prompt);
    }
  }

  async removeAIPrompt(id: string): Promise<void> {
    await this.delete(STORES.AI_PROMPTS, id);
  }

  async getAIFavorites(): Promise<any[]> {
    return await this.getAll<any>(STORES.AI_FAVORITES);
  }

  async cacheAIFavorites(favorites: any[]): Promise<void> {
    await this.clear(STORES.AI_FAVORITES);
    for (const fav of favorites) {
      if (fav.id) {
        await this.put(STORES.AI_FAVORITES, fav.id, fav);
      }
    }
  }

  async cacheAIFavorite(favorite: any): Promise<void> {
    if (favorite.id) {
      await this.put(STORES.AI_FAVORITES, favorite.id, favorite);
    }
  }

  async removeAIFavorite(id: string): Promise<void> {
    await this.delete(STORES.AI_FAVORITES, id);
  }

  // AI Assistants specific methods
  async getAIAssistants(): Promise<any[]> {
    return await this.getAll<any>(STORES.AI_ASSISTANTS);
  }

  async cacheAIAssistants(assistants: any[]): Promise<void> {
    for (const assistant of assistants) {
      if (assistant.id) {
        await this.put(STORES.AI_ASSISTANTS, assistant.id, assistant);
      }
    }
  }

  async cacheAIAssistant(assistant: any): Promise<void> {
    if (assistant.id) {
      await this.put(STORES.AI_ASSISTANTS, assistant.id, assistant);
    }
  }

  async removeAIAssistant(id: string): Promise<void> {
    await this.delete(STORES.AI_ASSISTANTS, id);
  }

  // AI Models specific methods
  async getAIModels(): Promise<any[]> {
    return await this.getAll<any>(STORES.AI_MODELS);
  }

  async cacheAIModels(models: any[]): Promise<void> {
    for (const model of models) {
      if (model.id) {
        await this.put(STORES.AI_MODELS, model.id, model);
      }
    }
  }

  async cacheAIModel(model: any): Promise<void> {
    if (model.id) {
      await this.put(STORES.AI_MODELS, model.id, model);
    }
  }

  async removeAIModel(id: string): Promise<void> {
    await this.delete(STORES.AI_MODELS, id);
  }

  // Clear and replace methods for proper sync (prevents stale data after delete)
  async clearAndCacheNotes(notes: any[]): Promise<void> {
    await this.clear(STORES.NOTES);
    await this.cacheNotes(notes);
  }

  async clearAndCacheConversations(conversations: any[]): Promise<void> {
    await this.clear(STORES.AI_CONVERSATIONS);
    for (const conv of conversations) {
      await this.cacheConversation(conv);
    }
  }

  async clearAndCacheAssistants(assistants: any[]): Promise<void> {
    await this.clear(STORES.AI_ASSISTANTS);
    await this.cacheAIAssistants(assistants);
  }

  async clearAndCacheModels(models: any[]): Promise<void> {
    await this.clear(STORES.AI_MODELS);
    await this.cacheAIModels(models);
  }

  async clearAndCacheTemplates(templates: any[]): Promise<void> {
    await this.clear(STORES.TEMPLATES);
    await this.cacheTemplates(templates);
  }

  async clearAndCacheFolders(folders: any[]): Promise<void> {
    await this.clear(STORES.FOLDERS);
    await this.cacheFolders(folders);
  }

  async getAIDrafts(): Promise<any[]> {
    return await this.getAll<any>(STORES.AI_DRAFTS);
  }

  async getAIDraft(id: string): Promise<any | null> {
    return await this.get<any>(STORES.AI_DRAFTS, id);
  }

  async cacheAIDraft(draft: any): Promise<void> {
    if (draft.id) {
      await this.put(STORES.AI_DRAFTS, draft.id, draft);
    }
  }

  async removeAIDraft(id: string): Promise<void> {
    await this.delete(STORES.AI_DRAFTS, id);
  }

  async addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: QueueItem = {
      id,
      timestamp: Date.now(),
      retries: 0,
      ...item,
    };

    await this.put(STORES.OFFLINE_QUEUE, id, queueItem);
    return id;
  }

  async getQueueItems(): Promise<QueueItem[]> {
    const items = await this.getAll<QueueItem>(STORES.OFFLINE_QUEUE);
    return items
      .filter(item => item !== undefined && item !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.delete(STORES.OFFLINE_QUEUE, id);
  }

  async clearQueue(): Promise<void> {
    await this.clear(STORES.OFFLINE_QUEUE);
  }

  // Sync status
  async isSynced(storeName: string, key: string): Promise<boolean> {
    const item = await this.get<any>(storeName, key);
    return item ? !!item.synced : false;
  }

  // Clean old data (older than specified days)
  async cleanOldData(storeName: string, daysOld = 7): Promise<void> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const items = await this.getAll<any>(storeName);

    for (const item of items) {
      if (item.timestamp < cutoffTime) {
        await this.delete(storeName, item.data.id);
      }
    }
  }

  // Get database size estimate
  async getDbSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      let totalSize = 0;

      const transaction = this.db!.transaction(
        Object.values(STORES),
        'readonly'
      );

      transaction.oncomplete = () => {
        resolve(totalSize);
      };

      transaction.onerror = () => {
        reject(new Error('Failed to calculate database size'));
      };

      for (const storeName of Object.values(STORES)) {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result;
          for (const item of items) {
            totalSize += JSON.stringify(item).length * 2; // Rough estimate in bytes
          }
        };
      }
    });
  }

  // Clear all data
  async clearAll(): Promise<void> {
    for (const storeName of Object.values(STORES)) {
      await this.clear(storeName);
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBService();

// Export class for custom instances
export { IndexedDBService };
