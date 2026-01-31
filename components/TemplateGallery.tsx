
import React, { useState, useEffect } from 'react';
import { AITemplate, TemplateCategory } from '../types';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';
import { useLanguageStore } from '../store/languageStore';
import TemplateForm from './TemplateForm';

const TemplateGallery: React.FC = () => {
  const { t } = useLanguageStore();

  // State management
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Personal' | 'Work'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load templates on mount and when filter/search changes
  useEffect(() => {
    loadTemplates();
  }, [filter, searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from IndexedDB first for fast UI
      try {
        const cached = await indexedDB.getTemplates();
        if (cached && cached.length > 0) {
          const filtered = filterTemplatesByCategory(cached, filter);
          setTemplates(filtered);
          // If we have cached data, we can set loading to false earlier if we want,
          // but we still want to fetch fresh data from API.
        }
      } catch (cacheErr) {
        console.warn('Failed to load templates from cache:', cacheErr);
      }

      const params: any = {};
      if (searchQuery) params.search = searchQuery;

      const response = await api.getTemplates(params) as { success: boolean; data: AITemplate[]; meta?: any };
      console.log('Templates response:', response); // Debug log
      
      if (response.success) {
        // Filter by category type
        const freshTemplates = response.data || [];
        const filtered = filterTemplatesByCategory(freshTemplates, filter);
        setTemplates(filtered);

        // Update cache with fresh data
        try {
          await indexedDB.cacheTemplates(freshTemplates);
        } catch (cacheErr) {
          console.warn('Failed to update templates cache:', cacheErr);
        }
      }
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplatesByCategory = (templates: AITemplate[], filter: string) => {
    if (filter === 'All') return templates;

    const workCategories = ['Planning', 'Brainstorm', 'Business', 'Development'];
    const personalCategories = ['Writing', 'Personal'];

    return templates.filter(t => {
      if (filter === 'Work') return workCategories.includes(t.category);
      if (filter === 'Personal') return personalCategories.includes(t.category);
      return true;
    });
  };

  const handleApplyTemplate = async (template: AITemplate) => {
    try {
      const response = await api.applyTemplate(template.id, {}) as { success: boolean; data: any };
      if (response.success) {
        // Trigger navigation to the new note
        window.location.hash = `#note-${response.data.id}`;
      }
    } catch (err: any) {
      console.error('Error applying template:', err);
      setError(err.message || 'Failed to apply template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.deleteTemplate(templateId);
      // Remove from cache too
      try {
        await indexedDB.removeTemplate(templateId);
      } catch (cacheErr) {
        console.warn('Failed to remove template from cache:', cacheErr);
      }
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError(err.message || 'Failed to delete template');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0c1419]">
      <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">Note Templates</h1>
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
            <input
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
              placeholder="Search templates..."
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <button
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
            onClick={() => setShowCreateForm(true)}
          >
            Create Template
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-red-200 mb-4">error</span>
              <h3 className="text-lg font-bold text-red-500">{error}</h3>
              <button
                className="mt-4 text-primary hover:underline"
                onClick={() => {
                  setError(null);
                  loadTemplates();
                }}
              >
                Try again
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-200">
              <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">folder_off</span>
              <h3 className="text-lg font-bold text-gray-500">No {filter} templates found</h3>
              <p className="text-gray-400 text-sm">Create a new template to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="group bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="h-40 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center p-6 border-b border-gray-100 dark:border-gray-800 cursor-pointer" onClick={() => handleApplyTemplate(tmpl)}>
                    <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700 group-hover:text-primary transition-colors">
                      {tmpl.icon}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 rounded">
                          {tmpl.category}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                          {tmpl.noteType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(tmpl);
                            setShowCreateForm(true);
                          }}
                          className="material-symbols-outlined text-gray-300 hover:text-blue-400 cursor-pointer text-lg p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Edit template"
                        >
                          edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tmpl.id);
                          }}
                          className="material-symbols-outlined text-gray-300 hover:text-red-400 cursor-pointer text-lg p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Delete template"
                        >
                          delete
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 h-8">
                      {tmpl.description || `Start with a pre-configured ${tmpl.name.toLowerCase()} layout.`}
                    </p>
                    
                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-primary hover:text-white dark:hover:bg-primary text-gray-600 dark:text-gray-300 transition-all text-xs font-semibold border border-gray-100 dark:border-gray-700/50 group/btn"
                    >
                      <span className="material-symbols-outlined text-sm group-hover/btn:scale-110 transition-transform">add_circle</span>
                      Create Note
                    </button>

                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      <span>{tmpl.usageCount} uses</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Template Modal */}
      {showCreateForm && (
        <TemplateForm
          template={selectedTemplate}
          onSave={(savedTemplate) => {
            // Add or update template in the list
            if (selectedTemplate) {
              setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
            } else {
              setTemplates([savedTemplate, ...templates]);
            }
            setShowCreateForm(false);
            setSelectedTemplate(null);
          }}
          onCancel={() => {
            setShowCreateForm(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};

export default TemplateGallery;
