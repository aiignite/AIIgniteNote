
export type NoteType = 'Markdown' | 'Rich Text' | 'Mind Map' | 'Drawio';

// Template types
export type TemplateCategory = 'Planning' | 'Brainstorm' | 'Writing' | 'Business' | 'Development' | 'Personal' | 'General';
export type TemplateNoteType = 'MARKDOWN' | 'RICHTEXT' | 'MINDMAP' | 'FLOWCHART';

export interface AITemplate {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  category: TemplateCategory;
  icon: string;
  noteType?: TemplateNoteType;
  isActive: boolean;
  isPublic: boolean;
  userId?: string;
  workspaceId?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  prompt: string;
  category?: TemplateCategory;
  icon?: string;
  noteType?: TemplateNoteType;
  workspaceId?: string;
  isPublic?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  prompt?: string;
  category?: TemplateCategory;
  icon?: string;
  noteType?: TemplateNoteType;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface ApplyTemplateRequest {
  workspaceId?: string;
  folderId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  updatedAt: string;
  createdAt: string;     // Added for sorting
  timestamp: number;     // Added for accurate sorting
  folder: string;
  tags: string[];
  isFavorite?: boolean;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  type?: 'checklist' | 'text' | 'mindmap' | 'actions';
  items?: { label: string; checked: boolean }[];
  suggestions?: { label: string; icon: string }[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  status: 'Active' | 'Pending';
  avatar: string;
}

export type SettingsTab = 'General' | 'Profile' | 'Users' | 'AI' | 'Tags';

// AI Provider types - Must match backend/src/types/index.ts
export type AIProvider = 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'OLLAMA' | 'LMSTUDIO';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  enabled: boolean;
}

export interface AISettings {
  defaultProvider: AIProvider;
  defaultModel: string;
  providers: {
    google: AIProviderConfig & { models: string[] };
    anthropic: AIProviderConfig & { models: string[] };
    openai: AIProviderConfig & { models: string[] };
    ollama: AIProviderConfig & { url: string; models: string[] };
    lmstudio: AIProviderConfig & { url: string; models: string[] };
  };
}

export type ViewState = 'editor' | 'templates' | 'settings' | 'favorites' | 'tags' | 'trash' | 'ai-dashboard';
