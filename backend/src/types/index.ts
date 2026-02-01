import { Request } from 'express';

// API Response Types
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export type AuthRequest = AuthenticatedRequest;

// User Types
export interface UserCreateInput {
  name?: string;
  email: string;
  password: string;
}

export interface UserUpdateInput {
  name?: string;
  image?: string;
}

// Note Types
export enum NoteType {
  MARKDOWN = 'MARKDOWN',
  RICHTEXT = 'RICHTEXT',
  MINDMAP = 'MINDMAP',
  FLOWCHART = 'FLOWCHART'
}

export interface NoteCreateInput {
  title: string;
  content: string;
  noteType: NoteType;
  folderId?: string;
  workspaceId?: string;
  tags?: string[];
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  noteType?: NoteType;
  folderId?: string;
  isFavorite?: boolean;
  tags?: Array<{ name: string; color?: string }>;
}

export interface NotesListParams {
  page?: number;
  limit?: number;
  folderId?: string;
  workspaceId?: string;
  isFavorite?: boolean;
  isDeleted?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// AI Types
export enum AIProvider {
  GEMINI = 'GEMINI',
  ANTHROPIC = 'ANTHROPIC',
  OPENAI = 'OPENAI',
  OLLAMA = 'OLLAMA',
  LMSTUDIO = 'LMSTUDIO'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

// File Types
export interface FileUploadResult {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name?: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
