
import React, { useState, useEffect } from 'react';
import { Note, ViewState } from './types';
import { INITIAL_NOTES } from './constants';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import AIPanel from './components/AIPanel';
import TemplateGallery from './components/TemplateGallery';
import Settings from './components/Settings';
import SearchView from './components/SearchView';
import AIDashboard from './components/AIDashboard';
import LoginPage from './components/LoginPage';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('editor');
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(INITIAL_NOTES[0].id);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  const activeNote = notes.find(n => n.id === selectedNoteId) || null;

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleAddNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      type: 'Markdown',
      updatedAt: 'Just now',
      folder: 'General',
      tags: []
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setCurrentView('editor');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('editor'); // Reset view for next login
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'ai-dashboard':
        return <AIDashboard />;
      case 'search':
        return <SearchView onSelectNote={setSelectedNoteId} onViewChange={setCurrentView} />;
      case 'templates':
        return <TemplateGallery />;
      case 'settings':
        return <Settings />;
      case 'editor':
      default:
        return (
          <div className="flex-1 flex overflow-hidden">
            <NoteList 
              notes={notes} 
              selectedNoteId={selectedNoteId} 
              onSelectNote={setSelectedNoteId} 
              onAddNote={handleAddNote}
            />
            <Editor note={activeNote} onUpdateNote={handleUpdateNote} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {renderContent()}
        
        {currentView === 'editor' && aiPanelOpen && (
          <AIPanel 
            activeNote={activeNote} 
            onClose={() => setAiPanelOpen(false)} 
          />
        )}
        
        {!aiPanelOpen && currentView === 'editor' && (
          <button 
            onClick={() => setAiPanelOpen(true)}
            className="fixed bottom-6 right-6 size-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform z-50"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
