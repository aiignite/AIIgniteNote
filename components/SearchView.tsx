
import React, { useState } from 'react';
import { Note } from '../types';
import { INITIAL_NOTES } from '../constants';

interface SearchViewProps {
  onSelectNote: (id: string) => void;
  onViewChange: (view: 'editor') => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onSelectNote, onViewChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Notes', 'Folders', 'Images', 'Checklists'];
  const recentSearches = ['Roadmap 2024', 'Meeting notes', 'React hooks', 'Marketing'];

  const filteredNotes = INITIAL_NOTES.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResultClick = (id: string) => {
    onSelectNote(id);
    onViewChange('editor');
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0c1419] overflow-hidden">
      {/* Search Header */}
      <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-[#111c22]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Search Everything</h1>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-2xl">
              search
            </span>
            <input 
              autoFocus
              type="text"
              placeholder="Search across notes, tags, and content..."
              className="w-full pl-14 pr-20 py-4 bg-white dark:bg-[#1c2b33] border-none rounded-2xl text-lg shadow-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">⌘ K</kbd>
              <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Recent:</span>
            {recentSearches.map(term => (
              <button 
                key={term}
                onClick={() => setSearchQuery(term)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary rounded-lg text-xs font-medium transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filters Sidebar */}
        <aside className="w-64 border-r border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-8 shrink-0">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Categories</h3>
            <nav className="space-y-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeFilter === f 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {f === 'All' ? 'dashboard' : f === 'Notes' ? 'description' : f === 'Folders' ? 'folder' : f === 'Images' ? 'image' : 'checklist'}
                    </span>
                    {f}
                  </div>
                  <span className="text-[10px] opacity-60">
                    {f === 'All' ? INITIAL_NOTES.length : (f === 'Notes' ? INITIAL_NOTES.length : 0)}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Filter by Tags</h3>
            <div className="flex flex-wrap gap-2">
              {['Work', 'Roadmap', 'Design', 'Sync', 'Personal'].map(tag => (
                <button key={tag} className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold rounded-md hover:border-primary border border-transparent transition-all">
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-gray-500">
                {searchQuery ? `Showing results for "${searchQuery}"` : 'All Documents'}
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px]">
                  {filteredNotes.length} matches
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                Sort by: 
                <select className="bg-transparent border-none p-0 text-xs font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer">
                  <option>Relevance</option>
                  <option>Last Edited</option>
                  <option>Name</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => handleResultClick(note.id)}
                    className="group p-5 bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined">
                            {note.type === 'Markdown' ? 'article' : note.type === 'Mind Map' ? 'account_tree' : 'edit_square'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold group-hover:text-primary transition-colors">{note.title}</h3>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">folder</span>
                            {note.folder} • {note.updatedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {note.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-[9px] font-bold text-gray-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 pl-[52px]">
                      {note.content.replace(/[#*`>]/g, '')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                  </div>
                  <h3 className="text-lg font-bold">No results found</h3>
                  <p className="text-gray-500 max-w-xs mt-2">We couldn't find anything matching your search. Try different keywords or check your spelling.</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-6 text-primary font-bold hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* AI Suggestion Section */}
            {searchQuery && filteredNotes.length > 0 && (
              <div className="mt-12 p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">AI Semantic Matches</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Based on your search for "<strong>{searchQuery}</strong>", you might also be interested in:
                </p>
                <div className="flex gap-3">
                  <div className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer">
                    <p className="text-xs font-bold mb-1">Q3 Strategic Goals</p>
                    <p className="text-[10px] text-gray-400 italic">Mentioned similar keywords in Strategy folder</p>
                  </div>
                  <div className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer">
                    <p className="text-xs font-bold mb-1">Archived Projects 2023</p>
                    <p className="text-[10px] text-gray-400 italic">Relates to "Roadmap" concepts</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchView;
