
import React, { useState, useEffect } from 'react';
import { Note, ViewState, NoteType } from './types';
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
import { useThemeStore } from './store/themeStore';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('editor');
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // Start with null to show list/folders initially
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // Resize State
  const [leftPanelWidth, setLeftPanelWidth] = useState(380);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Destructure primaryColor to use as dependency for the effect
  const { primaryColor, getTheme } = useThemeStore();

  // Apply theme color to CSS variables whenever primaryColor changes
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.style.setProperty('--color-primary', theme.rgb);
  }, [primaryColor, getTheme]);

  // Handle Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        // 64 is sidebar width
        const newWidth = e.clientX - 64; 
        if (newWidth >= 250 && newWidth <= 600) {
          setLeftPanelWidth(newWidth);
        }
      }
      if (isDraggingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 300 && newWidth <= 800) {
          setRightPanelWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDraggingLeft, isDraggingRight]);

  const activeNote = notes.find(n => n.id === selectedNoteId) || null;

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleDeleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (selectedNoteId === id && newNotes.length > 0) {
      setSelectedNoteId(newNotes[0].id);
    } else if (newNotes.length === 0) {
      setSelectedNoteId(null);
    }
  };

  const handleAddNote = (type: NoteType = 'Markdown', folder: string = 'General') => {
    const now = new Date();
    // Format date as YYYY.MM.DD
    const dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    
    const newNote: Note = {
      id: Date.now().toString(),
      title: `New ${type} Note`,
      content: '',
      type: type,
      updatedAt: dateStr,
      createdAt: dateStr,
      timestamp: now.getTime(),
      folder: folder,
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
      case 'tags': // Reuse editor/list view for tags for now
      case 'favorites':
      case 'trash':
      default:
        return (
          <div className="flex-1 flex overflow-hidden relative">
            <NoteList 
              notes={notes} 
              selectedNoteId={selectedNoteId} 
              onSelectNote={setSelectedNoteId} 
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onUpdateNote={handleUpdateNote}
              width={leftPanelWidth}
            />
            {/* Left Resizer */}
            <div
              className={`w-1 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0 z-20 ${isDraggingLeft ? 'bg-primary' : 'bg-transparent'}`}
              onMouseDown={() => setIsDraggingLeft(true)}
              title="Drag to resize list"
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
          <>
            {/* Right Resizer */}
            <div
              className={`w-1 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0 z-20 ${isDraggingRight ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'}`}
              onMouseDown={() => setIsDraggingRight(true)}
              title="Drag to resize AI Panel"
            />
            <AIPanel 
              activeNote={activeNote} 
              onClose={() => setAiPanelOpen(false)} 
              width={rightPanelWidth}
            />
          </>
        )}
        
        {!aiPanelOpen && (currentView === 'editor' || currentView === 'tags') && (
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
