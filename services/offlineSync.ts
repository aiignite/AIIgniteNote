/**
 * Offline Data Sync Service for AI Ignite Note
 * Handles offline queue processing and data synchronization
 */

import { indexedDB, STORES, QueueItem } from './indexedDB';
import { api } from './api';

class OfflineSyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncInterval: number | null = null;

  constructor() {
    this.initializeNetworkMonitoring();
  }

  // Initialize network status monitoring
  private initializeNetworkMonitoring() {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('Network: online');
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('Network: offline');
      });
    }
  }

  // Get current network status
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // Add request to offline queue
  async enqueueRequest(method: string, url: string, body?: any): Promise<string> {
    const queueId = await indexedDB.addToQueue({
      method,
      url,
      body,
    });

    console.log('Request queued:', { method, url, queueId });

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return queueId;
  }

  // Process offline queue
  async processQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return;
    }

    this.syncInProgress = true;
    console.log('Processing offline queue...');

    try {
      const queueItems = await indexedDB.getQueueItems();

      if (queueItems.length === 0) {
        console.log('Queue is empty');
        return;
      }

      console.log(`Processing ${queueItems.length} queued items`);

      const processQueueItems = async () => {
        for (const item of queueItems) {
          await this.processQueueItem(item);
        }
      };

      await processQueueItems();

      console.log('Queue processing complete');
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process single queue item
  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      console.log('Processing item:', item);

      await api.ensureInitialized();
      const baseURL = api['baseURL'];
      const accessToken = api['accessToken'];

      // Make the API request
      const response = await fetch(`${baseURL}${item.url}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && {
            'Authorization': `Bearer ${accessToken}`,
          }),
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (response.ok) {
        // Remove from queue on success
        await indexedDB.removeFromQueue(item.id);
        console.log('Item processed successfully, removed from queue');
      } else {
        // Handle errors
        const errorData = await response.json().catch(() => null);
        console.error('Item processing failed:', errorData);

        // Check if we should retry
        if (item.retries < 3) {
          // Update retry count
          item.retries++;
          await indexedDB.put(STORES.OFFLINE_QUEUE, item.id, item);
          console.log(`Retry ${item.retries}/3 for item:`, item.id);
        } else {
          // Max retries reached, remove from queue
          await indexedDB.removeFromQueue(item.id);
          console.error('Max retries reached, removing item from queue:', item.id);
        }
      }
    } catch (error) {
      console.error('Error processing queue item:', error);

      // Check if we should retry
      if (item.retries < 3) {
        item.retries++;
        await indexedDB.put(STORES.OFFLINE_QUEUE, item.id, item);
        console.log(`Retry ${item.retries}/3 for item:`, item.id);
      } else {
        // Max retries reached, remove from queue
        await indexedDB.removeFromQueue(item.id);
        console.error('Max retries reached, removing item from queue:', item.id);
      }
    }
  }

  // Start automatic sync interval
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processQueue();
      }
    }, intervalMs);

    console.log(`Auto-sync started (interval: ${intervalMs}ms)`);
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  // Manual sync trigger
  async syncNow(): Promise<void> {
    return this.processQueue();
  }

  // Get queue status
  async getQueueStatus(): Promise<{
    total: number;
    pending: number;
    retries: number;
  }> {
    const queueItems = await indexedDB.getQueueItems();

    return {
      total: queueItems.length,
      pending: queueItems.filter(item => item.retries === 0).length,
      retries: queueItems.filter(item => item.retries > 0).length,
    };
  }

  // Clear queue
  async clearQueue(): Promise<void> {
    await indexedDB.clearQueue();
    console.log('Queue cleared');
  }

  // Sync data from server
  // Implements timestamp-based conflict resolution
  async syncFromServer(): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - cannot sync from server');
      return;
    }

    console.log('Syncing data from server with conflict resolution...');

    try {
      // Sync notes
      try {
        const notesResponse = await api.getNotes();
        if (notesResponse.success && Array.isArray(notesResponse.data)) {
          const serverNotes = notesResponse.data;
          const localNotes = await indexedDB.getNotes();
          const localNotesMap = new Map(localNotes.map(n => [n.id, n]));

          for (const serverNote of serverNotes) {
            const localNote = localNotesMap.get(serverNote.id);
            
            if (!localNote) {
              await indexedDB.cacheNote(serverNote);
            } else {
              const serverTime = new Date(serverNote.updatedAt).getTime();
              const localTime = new Date(localNote.updatedAt).getTime();

              if (serverTime > localTime) {
                await indexedDB.cacheNote(serverNote);
              } else if (serverTime < localTime) {
                console.log(`[Sync] Local note ${serverNote.id} is newer, keeping local`);
              }
            }
          }

          const serverNoteIds = new Set(serverNotes.map(n => n.id));
          for (const localNote of localNotes) {
            if (!serverNoteIds.has(localNote.id)) {
              await indexedDB.removeNote(localNote.id);
            }
          }

          console.log('[Sync] Notes synced with conflict resolution');
        }
      } catch (err) {
        console.warn('Failed to sync notes:', err);
      }

      // Sync folders
      try {
        const foldersResponse = await api.getFolders() as any;
        if (foldersResponse?.success && Array.isArray(foldersResponse.data)) {
          await indexedDB.clearAndCacheFolders(foldersResponse.data);
          console.log('[Sync] Folders synced:', foldersResponse.data.length);
        }
      } catch (err) {
        console.warn('Failed to sync folders:', err);
      }

      // Sync tags
      try {
        const tagsResponse = await api.getTags() as any;
        if (tagsResponse?.success && Array.isArray(tagsResponse.data)) {
          await indexedDB.clearAndCacheTags(tagsResponse.data);
          console.log('[Sync] Tags synced:', tagsResponse.data.length);
        }
      } catch (err) {
        console.warn('Failed to sync tags:', err);
      }

      // Sync workspaces
      try {
        const workspacesResponse = await api.getWorkspaces() as any;
        if (workspacesResponse?.success && Array.isArray(workspacesResponse.data)) {
          await indexedDB.clearAndCacheWorkspaces(workspacesResponse.data);
          console.log('[Sync] Workspaces synced:', workspacesResponse.data.length);
        }
      } catch (err) {
        console.warn('Failed to sync workspaces:', err);
      }

      // Sync templates
      try {
        const templatesResponse = await api.getTemplates();
        if (templatesResponse?.success && Array.isArray(templatesResponse.data)) {
          await indexedDB.clearAndCacheTemplates(templatesResponse.data);
          console.log('[Sync] Templates synced:', templatesResponse.data.length);
        }
      } catch (err) {
        console.warn('Failed to sync templates:', err);
      }

      // Sync user settings
      try {
        const settingsResponse = await api.getUserSettings();
        if (settingsResponse?.success && settingsResponse.data) {
          const serverSettings = settingsResponse.data;
          const localSettings = await indexedDB.getSettings();
          
          if (!localSettings) {
            await indexedDB.cacheSettings(serverSettings);
          } else {
            await indexedDB.cacheSettings({ ...localSettings, ...serverSettings });
          }
        }
      } catch (err) {
        console.warn('Failed to sync user settings:', err);
      }

      // Sync AI settings
      try {
        const aiSettingsResponse = await api.getAISettings();
        if (aiSettingsResponse?.success && aiSettingsResponse.data) {
          await indexedDB.cacheAISettings(aiSettingsResponse.data);
        }
      } catch (err) {
        console.warn('Failed to sync AI settings:', err);
      }

      // Sync AI Conversations
      try {
        const conversationsResponse = await api.getAIConversations() as any;
        if (conversationsResponse?.success && Array.isArray(conversationsResponse.data)) {
          const serverConvs = conversationsResponse.data;
          const localConvs = await indexedDB.getConversations();
          const localConvsMap = new Map(localConvs.map(c => [c.id, c]));

          for (const serverConv of serverConvs) {
            const localConv = localConvsMap.get(serverConv.id);
            if (!localConv || new Date(serverConv.updatedAt).getTime() > new Date(localConv.updatedAt).getTime()) {
              await indexedDB.cacheConversation(serverConv);
            }
          }

          const serverConvIds = new Set(serverConvs.map(c => c.id));
          for (const localConv of localConvs) {
            if (!serverConvIds.has(localConv.id)) {
              await indexedDB.removeConversation(localConv.id);
            }
          }
          console.log('[Sync] AI Conversations synced:', serverConvs.length);
        }
      } catch (err) {
        console.warn('Failed to sync AI conversations:', err);
      }

      // Sync AI Favorites
      try {
        const favoritesResponse = await api.getFavoriteMessages() as any;
        if (favoritesResponse?.success && Array.isArray(favoritesResponse.data)) {
          await indexedDB.cacheAIFavorites(favoritesResponse.data);
        }
      } catch (err) {
        console.warn('Failed to sync AI favorites:', err);
      }

      // Sync AI Prompts
      try {
        const promptsResponse = await api.getCustomPrompts() as any;
        if (promptsResponse?.success && Array.isArray(promptsResponse.data)) {
          await indexedDB.cacheAIPrompts(promptsResponse.data);
        }
      } catch (err) {
        console.warn('Failed to sync AI prompts:', err);
      }

      // Sync AI Assistants
      try {
        const assistantsResponse = await api.getAIAssistants() as any;
        if (assistantsResponse?.success && assistantsResponse.data) {
          const allAssistants = [...(assistantsResponse.data.system || []), ...(assistantsResponse.data.custom || [])];
          await indexedDB.clearAndCacheAssistants(allAssistants);
          console.log('[Sync] AI Assistants synced:', allAssistants.length);
        }
      } catch (err) {
        console.warn('Failed to sync AI assistants:', err);
      }

      // Sync AI Models
      try {
        const modelsResponse = await api.getAIModels() as any;
        if (modelsResponse?.success && Array.isArray(modelsResponse.data)) {
          await indexedDB.clearAndCacheModels(modelsResponse.data);
          console.log('[Sync] AI Models synced:', modelsResponse.data.length);
        }
      } catch (err) {
        console.warn('Failed to sync AI models:', err);
      }

      console.log('Data sync from server complete');
    } catch (error) {
      console.error('Error syncing from server:', error);
      throw error;
    }
  }

  // Initialize IndexedDB and start sync service
  async initialize(): Promise<void> {
    try {
      await indexedDB.init();
      console.log('IndexedDB initialized');

      // Start auto-sync
      this.startAutoSync();

      // Process any pending queue items
      if (this.isOnline) {
        await this.processQueue();
      }

      // Sync data from server (don't throw if sync fails)
      try {
        await this.syncFromServer();
      } catch (syncError) {
        console.warn('Initial sync failed, app will continue:', syncError);
      }
    } catch (error) {
      console.error('Error initializing sync service:', error);
      // Don't throw - allow app to continue without offline sync
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncService();

// Export class for custom instances
export { OfflineSyncService };
