
import React from 'react';
import { Note } from '../types';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, selectedNoteId, onSelectNote, onAddNote }) => {
  return (
    <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-background-dark shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">My Notes</h2>
          <button 
            onClick={onAddNote}
            className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <span className="material-symbols-outlined text-sm">search</span>
          </div>
          <input 
            className="block w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1c2b33] border-none rounded-lg text-sm placeholder-gray-400 focus:ring-1 focus:ring-primary" 
            placeholder="Search in notes..." 
            type="text"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {notes.map((note) => (
          <div 
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={`px-4 py-4 flex flex-col gap-1 cursor-pointer transition-all border-b border-gray-100 dark:border-gray-800 ${
              selectedNoteId === note.id 
                ? 'bg-white dark:bg-primary/10 border-l-4 border-primary' 
                : 'hover:bg-white dark:hover:bg-gray-800/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                note.type === 'Markdown' ? 'text-primary' : 
                note.type === 'Rich Text' ? 'text-emerald-500' :
                'text-purple-500'
              }`}>
                {note.type}
              </span>
              <span className="text-[10px] text-gray-400">{note.updatedAt}</span>
            </div>
            <h3 className="font-semibold text-sm line-clamp-1">{note.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {note.content.substring(0, 100)}...
            </p>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400">
        <span>{notes.length} Notes</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span> Cloud Synced
        </span>
      </div>
    </div>
  );
};

export default NoteList;
