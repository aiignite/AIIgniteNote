
export type NoteType = 'Markdown' | 'Rich Text' | 'Mind Map' | 'Drawio';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  updatedAt: string;
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

export type SettingsTab = 'General' | 'Profile' | 'Security' | 'AI' | 'Users';

export type ViewState = 'editor' | 'templates' | 'search' | 'settings' | 'favorites' | 'trash' | 'ai-dashboard';
