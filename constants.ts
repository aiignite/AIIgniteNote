
import { Note } from './types';

export const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'System Design Completed',
    type: 'Markdown',
    content: '# System Design\n\nArchitecture approved. Moving to implementation phase.',
    updatedAt: '2024.01.19',
    createdAt: '2024.01.19',
    timestamp: 1705622400000,
    folder: 'System Design',
    tags: ['design', 'architecture']
  },
  {
    id: '2',
    title: 'Code Application Logic',
    type: 'Markdown',
    content: 'Main loop implementation details...',
    updatedAt: '2023.12.12',
    createdAt: '2023.12.12',
    timestamp: 1702339200000,
    folder: 'Code App',
    tags: ['dev']
  },
  {
    id: '3',
    title: 'Deployment Issues Log',
    type: 'Rich Text',
    content: 'Server timeout on port 8080 during load testing.',
    updatedAt: '2023.12.11',
    createdAt: '2023.12.11',
    timestamp: 1702252800000,
    folder: 'Deployment',
    tags: ['bugs', 'devops']
  },
  {
    id: '4',
    title: 'Legacy System Archive',
    type: 'Markdown',
    content: 'Notes on the V1 migration path.',
    updatedAt: '2021.05.27',
    createdAt: '2021.05.27',
    timestamp: 1622073600000,
    folder: 'History',
    tags: ['archive']
  },
  {
    id: '5',
    title: 'PLMS History Data',
    type: 'Markdown',
    content: 'Development tasks, deployment tasks, non-productive material procurement, process design 2024/11/16...',
    updatedAt: '2024.11.21',
    createdAt: '2024.11.21',
    timestamp: 1732147200000,
    folder: 'History',
    tags: ['data']
  },
  {
    id: '6',
    title: 'Frontend Refactor',
    type: 'Markdown',
    content: 'Switching to Tailwind CSS for better maintainability.',
    updatedAt: '2 days ago',
    createdAt: '2024.01.20',
    timestamp: 1705708800000,
    folder: 'Code App',
    tags: ['frontend']
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
