
import { Note } from './types';

export const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Product Roadmap 2024',
    type: 'Markdown',
    content: `# Product Roadmap 2024\n\nThe 2024 roadmap focuses on **AI-driven productivity** and **seamless collaboration** across platforms.\n\n## Q1 Focus: Intelligence\n\n* Integrate GPT-4 Turbo for complex summarizing tasks.\n* Real-time voice-to-text transcription with speaker identification.\n* Semantic search across all notebook types.\n\n> "Our goal is to reduce the friction between thinking and documenting by 50% this year."\n> — Head of Product`,
    updatedAt: '2m ago',
    folder: 'Work',
    tags: ['roadmap', 'q1-2024', 'strategic']
  },
  {
    id: '2',
    title: 'Weekly Sync Meeting Notes',
    type: 'Rich Text',
    content: 'Review of last week\'s performance metrics and individual team updates regarding the Q3 launch. We discussed resource allocation and potential bottlenecks in the API migration.',
    updatedAt: '1h ago',
    folder: 'Work',
    tags: ['meeting', 'sync']
  },
  {
    id: '3',
    title: 'Campaign Strategy: Blue Horizon',
    type: 'Mind Map',
    content: 'Brainstorming session for the summer marketing campaign including social media and email strategy. Key themes: Sustainability, Community, Innovation.',
    updatedAt: '3h ago',
    folder: 'Marketing',
    tags: ['campaign', 'design']
  },
  {
    id: '4',
    title: 'Code Snippets - React Hooks',
    type: 'Markdown',
    content: 'Collection of useful custom hooks for state management and side effects in enterprise apps. Includes useLocalStorage, useDebounce, and useThrottle.',
    updatedAt: 'Yesterday',
    folder: 'Development',
    tags: ['react', 'hooks']
  }
];

export const TEMPLATES = [
  { id: 't1', name: 'Weekly Planner', category: 'Planning', icon: 'event_note' },
  { id: 't2', name: 'Mind Map Concept', category: 'Brainstorm', icon: 'account_tree' },
  { id: 't3', name: 'Research Paper', category: 'Writing', icon: 'article' },
  { id: 't4', name: 'Meeting Minutes', category: 'Business', icon: 'groups' },
  { id: 't5', name: 'API Documentation', category: 'Development', icon: 'code' },
  { id: 't6', name: 'Daily Journal', category: 'Personal', icon: 'history_edu' },
];
