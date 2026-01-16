
import React, { useState } from 'react';
import { Note, NoteType } from '../types';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (updatedNote: Note) => void;
}

const Editor: React.FC<EditorProps> = ({ note, onUpdateNote }) => {
  const [activeMode, setActiveMode] = useState<NoteType>(note?.type || 'Markdown');

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#0c1419] text-gray-400">
        <span className="material-symbols-outlined text-6xl mb-4">edit_document</span>
        <p>Select a note to start editing</p>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({ ...note, title: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote({ ...note, content: e.target.value });
  };

  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-[#0c1419] overflow-hidden">
      <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-primary">
            <span className="material-symbols-outlined">menu_open</span>
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-800"></div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['Markdown', 'Rich Text', 'Mind Map', 'Drawio'] as NoteType[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeMode === mode 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary px-3 py-1 rounded-md transition-colors">
            <span className="material-symbols-outlined text-lg">share</span>
            <span>Share</span>
          </button>
          <button className="text-gray-500 hover:text-primary">
            <span className="material-symbols-outlined text-lg">more_horiz</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-12 lg:px-24 xl:px-48 scrollbar-hide">
        <div className="max-w-3xl mx-auto">
          <input 
            className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white mb-8 p-0"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Untitled Note"
          />
          
          {activeMode === 'Markdown' ? (
            <textarea
              className="w-full h-[calc(100vh-300px)] text-lg leading-relaxed bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-300 p-0 resize-none font-mono"
              value={note.content}
              onChange={handleContentChange}
              placeholder="Start writing..."
            />
          ) : (
             <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
               {/* Simplified View for other modes */}
               <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-400 h-96">
                  <span className="material-symbols-outlined text-4xl mb-2">construction</span>
                  <p>{activeMode} visual editor simulation</p>
                  <p className="text-sm">In a full version, this would be a specialized editor.</p>
               </div>
             </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Editor;
