
import React, { useState } from 'react';
import { TEMPLATES } from '../constants';

const TemplateGallery: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Personal' | 'Work'>('All');

  const getCategoryType = (category: string) => {
    // Explicit mapping to ensure Work/Personal tabs have content
    if (['Planning', 'Brainstorm', 'Business', 'Development'].includes(category)) return 'Work';
    if (['Writing', 'Personal'].includes(category)) return 'Personal';
    return 'Other';
  };

  const filteredTemplates = TEMPLATES.filter(tmpl => {
    if (filter === 'All') return true;
    return getCategoryType(tmpl.category) === filter;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0c1419]">
      <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">Template Gallery</h1>
          <nav className="flex gap-4">
            {['All', 'Personal', 'Work'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`text-sm font-medium pb-4 mt-4 transition-colors relative ${
                  filter === tab 
                    ? 'text-primary' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'All' ? 'All Templates' : tab}
                {filter === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary" placeholder="Search templates..." type="text"/>
          </div>
          <button className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">Create Template</button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
              {filteredTemplates.map((tmpl) => (
                <div key={tmpl.id} className="group bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="h-40 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700 group-hover:text-primary transition-colors">{tmpl.icon}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{tmpl.category}</span>
                      <span className="material-symbols-outlined text-gray-300 hover:text-yellow-400 cursor-pointer text-lg">star</span>
                    </div>
                    <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{tmpl.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">Start with a pre-configured {tmpl.name} for your next project.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-200">
               <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">folder_off</span>
               <h3 className="text-lg font-bold text-gray-500">No {filter} templates found</h3>
               <p className="text-gray-400 text-sm">Create a new template to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TemplateGallery;
