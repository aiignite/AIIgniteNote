/// <reference types="vite/client" />

import { indexedDB } from './indexedDB';

// Types for API responses
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
  };
  accessToken: string;
  refreshToken: string;
}

// Note types
export interface Note {
  id: string;
  title: string;
  noteType: 'MARKDOWN' | 'RICHTEXT' | 'MINDMAP' | 'FLOWCHART';
  content?: string;
  folderId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isDeleted: boolean;
  author: {
    id: string;
    username: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export interface CreateNoteRequest {
  title: string;
  noteType: 'MARKDOWN' | 'RICHTEXT' | 'MINDMAP' | 'FLOWCHART';
  content?: string;
  folderId?: string;
  workspaceId?: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
}

export interface NotesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  folderId?: string;
  tagIds?: string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// AI types
export interface AIChatRequest {
  provider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'OLLAMA' | 'LMSTUDIO';
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  conversationId?: string;
  attachmentIds?: string[];
  model?: string;
  options?: {
    model?: string;
  };
}

export interface AIChatResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIConversation {
  id: string;
  provider: string;
  model: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// Folder types
export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  noteCount?: number;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    user: {
      id: string;
      username: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  _count?: {
    notes: number;
    members: number;
  };
}

export interface WorkspaceStats {
  noteCount: number;
  memberCount: number;
  recentActivity: Array<{
    id: string;
    title: string;
    updatedAt: string;
    author: {
      id: string;
      username: string;
    };
  }>;
}

// Search types
export interface ChatRoom {
  id: string;
  name?: string;
  type: 'DIRECT' | 'GROUP';
  members: ChatMember[];
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface ChatMember {
  userId: string;
  role: string;
  user: {
      id: string;
      name: string;
      image?: string;
      email?: string;
  };
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  createdAt: string;
  timestamp?: string; // Socket uses timestamp
  sender: {
      id: string;
      name: string;
      image?: string;
  };
}
export interface SearchQueryParams {
  query: string;
  folderId?: string;
  tagIds?: string[];
  startDate?: string;
  endDate?: string;
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// API Client Class
class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(baseURL?: string) {
    // Auto-detect base URL based on environment
    if (baseURL) {
      this.baseURL = baseURL;
    } else if (import.meta.env.VITE_API_URL) {
      this.baseURL = import.meta.env.VITE_API_URL;
    } else {
      // In Docker/prod, use empty string (endpoints already have /api prefix)
      // In dev, use the backend URL directly
      const isDev = import.meta.env.DEV;
      this.baseURL = isDev ? 'http://localhost:4000' : '';
    }
    this.initPromise = this.loadTokens();
  }

  async ensureInitialized() {
    return this.initPromise;
  }

  // Token Management
  private async loadTokens() {
    try {
      const cached = await indexedDB.getAuthTokens();
      if (cached) {
        this.accessToken = cached.accessToken;
        this.refreshToken = cached.refreshToken;
      } else {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        
        if (this.accessToken && this.refreshToken) {
          await indexedDB.cacheAuthTokens(this.accessToken, this.refreshToken);
          console.log('[API] Migrated tokens from localStorage to IndexedDB');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    } catch (error) {
      console.error('[API] Failed to load tokens from IndexedDB:', error);
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  getToken(): string | null {
    return this.accessToken;
  }

  private async saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await indexedDB.cacheAuthTokens(accessToken, refreshToken);
  }

  private async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await indexedDB.clearAuthTokens();
  }

  // HTTP Request Helper
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureInitialized();
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Check if response is ok first
    if (!response.ok) {
      // Try to get error message from JSON response
      let errorMessage = 'Request failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          // Log full error data for debugging
          console.error('[API] Error response:', data);
          errorMessage = data.error?.message || data.message || data.error || 'Request failed';
          // Include validation details if available
          if (data.error?.details) {
            errorMessage += `: ${JSON.stringify(data.error.details)}`;
          }
        } else {
          // For non-JSON responses (like 429 rate limiting)
          const text = await response.text();
          errorMessage = text || `Request failed with status ${response.status}`;
        }
      } catch {
        // If JSON parsing fails, try to get text response
        try {
          const text = await response.text();
          errorMessage = text || `Request failed with status ${response.status}`;
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    // Parse successful JSON response
    const data = await response.json();
    return data as T;
  }

  // Transform note data from backend format to frontend format
  private transformNote(note: any): Note {
    // Ensure content is always a string
    let content: string;
    if (typeof note.content === 'object' && note.content?.content !== undefined) {
      content = String(note.content.content);
    } else if (typeof note.content === 'string') {
      content = note.content;
    } else {
      content = '';
    }

    return {
      ...note,
      content,
    };
  }

  // Auth Endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<{ success: true; data: AuthResponse }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );
    this.saveTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<{ user: any; message: string }> {
    const response = await this.request<{ success: true; data: { user: any; message: string } }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    // Don't save tokens on register anymore as verification is required
    return response.data;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await this.request<{ success: true; data: { message: string } }>(
      `/api/auth/verify-email?token=${token}`,
      {
        method: 'GET',
      }
    );
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokens();
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.saveTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearTokens();
    return false;
  }

  // User Endpoints
  async getProfile() {
    return this.request('/api/users/profile');
  }

  async updateProfile(data: { username?: string; avatarUrl?: string }) {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAISettings() {
    return this.request<{ success: true; data: any }>('/api/users/ai-settings');
  }

  async updateAISettings(data: any) {
    return this.request<{ success: true; data: any }>('/api/users/ai-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserSettings() {
    return this.request<{ success: true; data: any }>('/api/users/settings');
  }

  async updateUserSettings(data: any) {
    return this.request<{ success: true; data: any }>('/api/users/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Notes Endpoints
  async getNotes(params?: NotesQueryParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.folderId) queryParams.append('folderId', params.folderId);
    if (params?.tagIds) params.tagIds.forEach(id => queryParams.append('tagIds', id));
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const response = await this.request<{ success: true; data: any[]; meta?: any }>(
      `/api/notes${queryString ? `?${queryString}` : ''}`
    );
    // Transform notes to extract content from nested object
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map(note => this.transformNote(note));
    }
    return response as any;
  }

  async getNote(id: string) {
    const response = await this.request<{ success: true; data: any }>(`/api/notes/${id}`);
    // Transform note to extract content from nested object
    if (response.success && response.data) {
      response.data = this.transformNote(response.data);
    }
    return response as any;
  }

  async createNote(data: CreateNoteRequest) {
    const response = await this.request<{ success: true; data: any }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Transform note to extract content from nested object
    if (response.success && response.data) {
      response.data = this.transformNote(response.data);
    }
    return response as any;
  }

  async updateNote(id: string, data: UpdateNoteRequest) {
    console.log('[API] updateNote called with:', {
      id,
      title: data.title,
      contentLength: data.content?.length || 0,
      contentType: typeof data.content
    });

    const response = await this.request<{ success: true; data: any; status?: number }>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    console.log('[API] updateNote response:', {
      success: response.success,
      responseData: response.data
    });

    // Transform note to extract content from nested object
    if (response.success && response.data) {
      response.data = this.transformNote(response.data);
    }
    return response as any;
  }

  async deleteNote(id: string) {
    return this.request(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleFavoriteNote(id: string) {
    return this.request(`/api/notes/${id}/favorite`, {
      method: 'POST',
    });
  }

  async getNoteVersions(id: string) {
    return this.request(`/api/notes/${id}/versions`);
  }

  // AI Endpoints
  async chatAI(data: AIChatRequest) {
    return this.request<{ success: true; data: AIChatResponse }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Stream AI chat response using Server-Sent Events
   * @param data Chat request data
   * @param onChunk Callback for each chunk of data
   * @param onComplete Callback when streaming is complete
   * @param onError Callback for errors
   * @returns AbortController to cancel the stream
   */
  async chatAIStream(
    data: AIChatRequest,
    onChunk: (chunk: string, done: boolean, conversationId?: string) => void,
    onComplete?: (conversationId?: string) => void,
    onError?: (error: any) => void
  ): Promise<AbortController> {
    await this.ensureInitialized();
    const controller = new AbortController();
    const url = `${this.baseURL}/api/ai/chat/stream`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let finalConversationId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (onComplete) onComplete(finalConversationId);
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process SSE data lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            // Check for DONE signal
            if (data === '[DONE]') {
              if (onComplete) onComplete(finalConversationId);
              controller.abort();
              return controller;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle error in stream
              if (parsed.error) {
                if (onError) onError(parsed);
                controller.abort();
                return controller;
              }

              // Extract content and conversation ID
              const content = parsed.content || '';
              const done = parsed.done || false;
              finalConversationId = parsed.conversationId || finalConversationId;

              if (content) {
                onChunk(content, done, finalConversationId);
              }

              if (done) {
                if (onComplete) onComplete(finalConversationId);
                controller.abort();
                return controller;
              }
            } catch (e) {
              // Ignore JSON parse errors for non-JSON lines
              console.debug('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream was aborted');
      } else {
        console.error('Stream error:', error);
        if (onError) onError(error);
      }
    }

    return controller;
  }

  async getAIConversations() {
    return this.request('/api/ai/conversations');
  }

  async createAIConversation(assistantName?: string) {
    return this.request('/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ assistantName }),
    });
  }

  async getAIConversation(id: string) {
    return this.request(`/api/ai/conversations/${id}`);
  }

  async deleteAIConversation(id: string) {
    return this.request(`/api/ai/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async renameAIConversation(id: string, title: string) {
    return this.request(`/api/ai/conversations/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async toggleArchiveAIConversation(id: string) {
    return this.request(`/api/ai/conversations/${id}/archive`, {
      method: 'PATCH',
    });
  }

  async searchAIConversations(query: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    return this.request(`/api/ai/conversations/search?${params.toString()}`);
  }

  async getAIProviders() {
    return this.request('/api/ai/providers');
  }

  async getAIModels() {
    return this.request('/api/ai/models');
  }

  async createAIModel(data: {
    name: string;
    modelId: string;
    provider: string;
    endpoint?: string;
    apiKey?: string;
    popularity?: number;
    speed?: string;
    cost?: string;
    context?: string;
    description?: string;
  }) {
    return this.request('/api/ai/models', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAIModel(id: string, data: any) {
    return this.request(`/api/ai/models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAIModel(id: string) {
    return this.request(`/api/ai/models/${id}`, {
      method: 'DELETE',
    });
  }

  // AI Attachment Endpoints
  async uploadAIAttachment(file: File): Promise<any> {
    await this.ensureInitialized();
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseURL}/api/ai/attachments/upload`;
    const headers: HeadersInit = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<{ success: true; data: any }>(response);
  }

  async getAIAttachment(id: string) {
    return this.request(`/api/ai/attachments/${id}`);
  }

  async deleteAIAttachment(id: string) {
    return this.request(`/api/ai/attachments/${id}`, {
      method: 'DELETE',
    });
  }

  // Folders Endpoints
  async getFolders() {
    return this.request('/api/folders');
  }

  async getFolder(id: string) {
    return this.request(`/api/folders/${id}`);
  }

  async createFolder(data: { name: string; parentId?: string }) {
    return this.request('/api/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFolder(id: string, data: { name?: string; parentId?: string }) {
    return this.request(`/api/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(id: string) {
    return this.request(`/api/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // Tags Endpoints
  async getTags() {
    return this.request('/api/tags');
  }

  async getTag(id: string) {
    return this.request(`/api/tags/${id}`);
  }

  async createTag(data: { name: string; color?: string }) {
    return this.request('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTag(id: string, data: { name?: string; color?: string }) {
    return this.request(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: string) {
    return this.request(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  }

  async addTagToNote(noteId: string, tagId: string) {
    return this.request(`/api/notes/${noteId}/tags/${tagId}`, {
      method: 'POST',
    });
  }

  async removeTagFromNote(noteId: string, tagId: string) {
    return this.request(`/api/notes/${noteId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  // Search Endpoints
  async search(params: SearchQueryParams) {
    const queryParams = new URLSearchParams();
    queryParams.append('query', params.query);
    if (params.folderId) queryParams.append('folderId', params.folderId);
    if (params.tagIds) params.tagIds.forEach(id => queryParams.append('tagIds', id));
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return this.request<{ success: true; data: any[]; meta?: any }>(
      `/api/search?${queryParams.toString()}`
    );
  }

  async getSearchSuggestions(query: string, limit = 5) {
    return this.request<{ success: true; data: string[] }>(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getRecentSearches() {
    return this.request<{ success: true; data: string[] }>('/api/search/recent');
  }

  async saveRecentSearch(query: string) {
    return this.request<{ success: true; data: any }>('/api/search/recent', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Workspaces Endpoints
  async getWorkspaces() {
    return this.request('/api/workspaces');
  }

  async getWorkspace(id: string) {
    return this.request(`/api/workspaces/${id}`);
  }

  async createWorkspace(data: { name: string; description?: string }) {
    return this.request('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(id: string, data: { name?: string; description?: string }) {
    return this.request(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: string) {
    return this.request(`/api/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  async addWorkspaceMember(workspaceId: string, email: string, role: string) {
    return this.request(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async updateWorkspaceMemberRole(workspaceId: string, memberId: string, role: string) {
    return this.request(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string) {
    return this.request(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async leaveWorkspace(workspaceId: string) {
    return this.request(`/api/workspaces/${workspaceId}/leave`, {
      method: 'POST',
    });
  }

  async getWorkspaceStats(id: string) {
    return this.request<{ success: true; data: WorkspaceStats }>(`/api/workspaces/${id}/stats`);
  }

  // Template Endpoints
  async getTemplates(params?: { page?: number; limit?: number; category?: string; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.request<{ success: true; data: any[]; meta?: any }>(
      `/api/templates${queryString ? `?${queryString}` : ''}`
    );
  }

  async getTemplate(id: string) {
    return this.request<{ success: true; data: any }>(`/api/templates/${id}`);
  }

  async getSystemTemplates() {
    return this.request<{ success: true; data: any[] }>('/api/templates/system');
  }

  async createTemplate(data: { name: string; description?: string; prompt: string; category?: string; icon?: string; workspaceId?: string; isPublic?: boolean }) {
    return this.request<{ success: true; data: any }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: { name?: string; description?: string; prompt?: string; category?: string; icon?: string; isPublic?: boolean; isActive?: boolean }) {
    return this.request<{ success: true; data: any }>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string) {
    return this.request(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async applyTemplate(id: string, data: { workspaceId?: string; folderId?: string }) {
    return this.request<{ success: true; data: any }>(`/api/templates/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAIAssistants(workspaceId?: string) {
    return this.request<{ success: true; data: { system: any[]; custom: any[] } }>(`/api/ai-assistants${workspaceId ? `?workspaceId=${workspaceId}` : ''}`);
  }

  async getAIAssistant(id: string) {
    return this.request<{ success: true; data: any }>(`/api/ai-assistants/${id}`);
  }

  async createAIAssistant(data: {
    name: string;
    description?: string;
    avatar?: string;
    role?: string;
    category?: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
    enableWebSearch?: boolean;
    isSystem?: boolean;
    workspaceId?: string;
  }) {
    return this.request<{ success: true; data: any }>('/api/ai-assistants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAIAssistant(id: string, data: {
    name?: string;
    description?: string;
    avatar?: string;
    role?: string;
    category?: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
    enableWebSearch?: boolean;
  }) {
    return this.request<{ success: true; data: any }>(`/api/ai-assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAIAssistant(id: string) {
    return this.request(`/api/ai-assistants/${id}`, {
      method: 'DELETE',
    });
  }

  async getConversationTags(conversationId: string) {
    return this.request<{ success: true; data: any[] }>(`/api/ai-assistants/conversations/${conversationId}/tags`);
  }

  async addConversationTag(conversationId: string, tag: string) {
    return this.request<{ success: true; data: any }>('/api/ai-assistants/conversations/tags', {
      method: 'POST',
      body: JSON.stringify({ conversationId, tag }),
    });
  }

  async removeConversationTag(tagId: string) {
    return this.request(`/api/ai-assistants/conversations/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  async getFavoriteMessages() {
    return this.request<{ success: true; data: any[] }>(`/api/ai-assistants/favorites`);
  }

  async isMessageFavorited(messageId: string) {
    return this.request<{ success: true; data: { isFavorited: boolean } }>(`/api/ai-assistants/favorites/messages/${messageId}`);
  }

  async addToFavorites(messageId: string, conversationId: string) {
    return this.request<{ success: true; data: any }>('/api/ai-assistants/favorites', {
      method: 'POST',
      body: JSON.stringify({ messageId, conversationId }),
    });
  }

  async removeFromFavorites(messageId: string) {
    return this.request(`/api/ai-assistants/favorites/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async getCustomPrompts() {
    return this.request<{ success: true; data: any[] }>(`/api/ai-assistants/prompts`);
  }

  async getCustomPrompt(id: string) {
    return this.request<{ success: true; data: any }>(`/api/ai-assistants/prompts/${id}`);
  }

  async createCustomPrompt(data: {
    name: string;
    prompt: string;
    category?: string;
  }) {
    return this.request<{ success: true; data: any }>('/api/ai-assistants/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomPrompt(id: string, data: {
    name?: string;
    prompt?: string;
    category?: string;
  }) {
    return this.request<{ success: true; data: any }>(`/api/ai-assistants/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomPrompt(id: string) {
    return this.request(`/api/ai-assistants/prompts/${id}`, {
      method: 'DELETE',
    });
  }

  async healthCheck() {
    return this.request('/health');
  }

  // Chat API
  async getRooms(): Promise<ApiResponse<ChatRoom[]>> {
    return this.request<ChatRoom[]>('/api/chats/rooms');
  }

  async getRoomMessages(roomId: string): Promise<ApiResponse<ChatMessage[]>> {
    return this.request<ChatMessage[]>(`/api/chats/rooms/${roomId}/messages`);
  }

  async startDirectChat(userId: string): Promise<ApiResponse<ChatRoom>> {
    return this.request<ChatRoom>('/api/chats/rooms/direct', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async isAuthenticated(): Promise<boolean> {
    await this.ensureInitialized();
    return !!this.accessToken;
  }
}

export const api = new APIClient();

export { APIClient };

