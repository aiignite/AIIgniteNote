
export type NoteType = 'Markdown' | 'Rich Text' | 'Mind Map' | 'Drawio';

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
}

export interface ChatMessage {
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

export type SettingsTab = 'General' | 'Profile' | 'Users';

export type ViewState = 'editor' | 'templates' | 'search' | 'settings' | 'favorites' | 'tags' | 'trash' | 'ai-dashboard';
