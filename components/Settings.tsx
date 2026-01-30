
import React, { useState, useEffect } from 'react';
import { SettingsTab } from '../types';
import { useThemeStore, ThemeColor } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';

interface SettingsProps {
  initialTab?: SettingsTab;
  user?: { id: string; username: string; email: string } | null;
}

const Settings: React.FC<SettingsProps> = ({ initialTab = 'General', user }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { primaryColor, setPrimaryColor } = useThemeStore();
  const { language, setLanguage, t } = useLanguageStore();

  const [tags, setTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  
  // Workspace management state
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<any | null>(null);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);

  // Load tags and workspaces on mount
  useEffect(() => {
    loadTags();
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await api.getWorkspaces() as any;
      if (response?.success && Array.isArray(response?.data)) {
        setWorkspaces(response.data);
        // Set first workspace as current
        if (response.data.length > 0) {
          setCurrentWorkspaceId(response.data[0].id);
        }
        // Sync to IndexedDB using clear-and-replace
        try {
          await indexedDB.clearAndCacheWorkspaces(response.data);
          console.log('[loadWorkspaces] Workspaces synced to IndexedDB:', response.data.length);
        } catch (cacheError) {
          console.warn('[loadWorkspaces] Failed to sync workspaces to IndexedDB:', cacheError);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.getTags() as any;
      if (response?.success && Array.isArray(response?.data)) {
        setTags(response.data);
        // Sync to IndexedDB using clear-and-replace
        try {
          await indexedDB.clearAndCacheTags(response.data);
          console.log('[loadTags] Tags synced to IndexedDB:', response.data.length);
        } catch (cacheError) {
          console.warn('[loadTags] Failed to sync tags to IndexedDB:', cacheError);
        }
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const response = await api.createTag({ name: newTagName.trim(), color: '#6b7280' }) as any;
      if (response?.success) {
        // Cache to IndexedDB
        await indexedDB.cacheTag(response.data);
        setTags([...tags, response.data]);
        setNewTagName('');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      console.log('[Settings] Deleting tag:', id);
      const response = await api.deleteTag(id) as any;
      console.log('[Settings] Delete tag API response:', response);
      
      if (response?.success) {
        // Remove from IndexedDB cache
        await indexedDB.removeTag(id);
        console.log('[Settings] Tag removed from IndexedDB');
        setTags(tags.filter(t => t.id !== id));
      } else {
        throw new Error(response?.message || 'Failed to delete tag from server');
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

  // Workspace CRUD handlers
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const response = await api.createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDescription.trim() || undefined
      }) as any;
      if (response?.success) {
        await indexedDB.cacheWorkspace(response.data);
        setWorkspaces([...workspaces, response.data]);
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
        setShowWorkspaceForm(false);
        setCurrentWorkspaceId(response.data.id);
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace');
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!editingWorkspace || !newWorkspaceName.trim()) return;
    try {
      const response = await api.updateWorkspace(editingWorkspace.id, {
        name: newWorkspaceName.trim(),
        description: newWorkspaceDescription.trim() || undefined
      }) as any;
      if (response?.success) {
        await indexedDB.cacheWorkspace(response.data);
        setWorkspaces(workspaces.map(ws => ws.id === editingWorkspace.id ? response.data : ws));
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
        setEditingWorkspace(null);
        setShowWorkspaceForm(false);
      }
    } catch (error) {
      console.error('Failed to update workspace:', error);
      alert('Failed to update workspace');
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace? All notes and folders inside will be deleted.')) return;
    try {
      console.log('[Settings] Deleting workspace:', id);
      const response = await api.deleteWorkspace(id) as any;
      console.log('[Settings] Delete workspace API response:', response);
      
      if (response?.success) {
        await indexedDB.removeWorkspace(id);
        console.log('[Settings] Workspace removed from IndexedDB');
        const updatedWorkspaces = workspaces.filter(ws => ws.id !== id);
        setWorkspaces(updatedWorkspaces);
        if (currentWorkspaceId === id && updatedWorkspaces.length > 0) {
          setCurrentWorkspaceId(updatedWorkspaces[0].id);
        }
      } else {
        throw new Error(response?.message || 'Failed to delete workspace from server');
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace');
    }
  };

  const openEditWorkspace = (workspace: any) => {
    setEditingWorkspace(workspace);
    setNewWorkspaceName(workspace.name);
    setNewWorkspaceDescription(workspace.description || '');
    setShowWorkspaceForm(true);
  };

  // Load workspace members when current workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      loadWorkspaceMembers(currentWorkspaceId);
    }
  }, [currentWorkspaceId]);

  const loadWorkspaceMembers = async (workspaceId: string) => {
    try {
      const response = await api.getWorkspace(workspaceId) as any;
      if (response?.success && response?.data?.members) {
        setTeamMembers(response.data.members);
      }
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  };

  const colorOptions: { id: ThemeColor; bgClass: string }[] = [
    { id: 'orange', bgClass: 'bg-orange-600' },
    { id: 'purple', bgClass: 'bg-violet-500' },
    { id: 'green', bgClass: 'bg-emerald-500' },
    { id: 'blue', bgClass: 'bg-blue-500' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Tags':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold">Tag Management</h2>
              <p className="text-sm text-gray-500 mt-1">Organize your notes with custom tags</p>
            </div>

            <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Add New Tag</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name..."
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  onClick={handleAddTag}
                  className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
                >
                  Add Tag
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tags.map((tag) => (
                <div key={tag.id} className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full" style={{ backgroundColor: tag.color || '#6b7280' }}></div>
                    <span className="text-sm font-medium">{tag.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                      {tag.noteCount || 0} notes
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
              {tags.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-20">label_off</span>
                  <p className="text-sm">No tags found. Create your first tag above.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'Users':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Workspace Management Section */}
            <div>
              <h2 className="text-2xl font-bold">Workspace Management</h2>
              <p className="text-sm text-gray-500 mt-1">Create and manage your workspaces</p>
            </div>

            <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              {showWorkspaceForm ? (
                <div className="space-y-4">
                  <h3 className="font-bold">{editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}</h3>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Workspace name..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                  />
                  <textarea
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="Description (optional)..."
                    rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-4 text-sm focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={editingWorkspace ? handleUpdateWorkspace : handleCreateWorkspace}
                      className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md"
                    >
                      {editingWorkspace ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => { setShowWorkspaceForm(false); setEditingWorkspace(null); setNewWorkspaceName(''); setNewWorkspaceDescription(''); }}
                      className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowWorkspaceForm(true)}
                  className="flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">add</span> Create New Workspace
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaces.map((ws) => (
                <div key={ws.id} className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-xl">workspaces</span>
                      <div>
                        <p className="text-sm font-bold">{ws.name}</p>
                        {ws.description && <p className="text-[10px] text-gray-400">{ws.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEditWorkspace(ws)}
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWorkspace(ws.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {workspaces.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-20">workspaces</span>
                  <p className="text-sm">No workspaces found. Create your first workspace above.</p>
                </div>
              )}
            </div>

            {/* Team Management Section */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Team Members</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage access and roles for your workspace members</p>
                </div>
                <div className="flex items-center gap-3">
                  {workspaces.length > 1 && (
                    <select
                      value={currentWorkspaceId}
                      onChange={(e) => setCurrentWorkspaceId(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  )}
                  <button className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">person_add</span> Invite Member
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.user.image || `https://picsum.photos/seed/${member.user.id}/100/100`}
                              className="size-9 rounded-full border border-gray-100 dark:border-gray-700"
                              alt={member.user.name || 'User'}
                            />
                            <div>
                              <p className="text-sm font-bold">{member.user.name || member.user.email}</p>
                              <p className="text-[10px] text-gray-400">{member.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            member.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500' :
                            member.role === 'EDITOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {member.role === 'OWNER' ? 'Owner' :
                             member.role === 'ADMIN' ? 'Admin' :
                             member.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs">Active</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        <p className="text-sm">No members in this workspace yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Profile':
        return (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold">User Profile</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your personal information and account security</p>
            </div>

            {/* Personal Info Section */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative group shrink-0 mx-auto md:mx-0">
                <img src={`https://picsum.photos/seed/${user?.username || 'user'}/200/200`} className="size-32 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-xl" alt="Profile" />
                <button className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center backdrop-blur-sm">
                  <span className="material-symbols-outlined">photo_camera</span>
                </button>
              </div>

              <div className="flex-1 w-full space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input type="text" defaultValue={user?.username || ''} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                    <input type="email" defaultValue={user?.email || ''} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Biography</label>
                  <textarea rows={3} defaultValue="Senior Product Designer and tech enthusiast." className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary resize-none transition-all" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800"></div>

            {/* Security Section (Merged) */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Password & Security</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Password</label>
                   <input type="password" placeholder="••••••••" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div className="hidden md:block"></div> {/* Spacer */}

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                   <input type="password" placeholder="Enter new password" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                   <input type="password" placeholder="Confirm new password" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800 mt-6">
                <div>
                  <h4 className="font-bold text-sm">Two-Factor Authentication</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Secure your account with 2FA via SMS or Authenticator App.</p>
                </div>
                <button className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors focus:outline-none">
                  <div className="absolute left-1 top-1 size-4 bg-white rounded-full shadow-sm transition-transform"></div>
                </button>
              </div>

              <div className="flex justify-start pt-2">
                 <button className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">logout</span> Log out of all devices
                 </button>
              </div>
            </div>
          </div>
        );
      case 'General':
      default:
        return (
          <div className="space-y-12 animate-in fade-in duration-300">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">{t.settings.appearance}</h3>
              <div className="space-y-6">

                {/* Language Switcher */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.settings.language}</p>
                    <p className="text-xs text-gray-500">{t.settings.languageDesc}</p>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${
                        language === 'en'
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('zh')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${
                        language === 'zh'
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      中文
                    </button>
                  </div>
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.settings.interfaceTheme}</p>
                    <p className="text-xs text-gray-500">{t.settings.interfaceThemeDesc}</p>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 shadow-sm rounded-md flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">light_mode</span> {t.settings.light}
                    </button>
                    <button className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">dark_mode</span> {t.settings.dark}
                    </button>
                  </div>
                </div>

                {/* Color Switcher */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.settings.primaryColor}</p>
                    <p className="text-xs text-gray-500">{t.settings.primaryColorDesc}</p>
                  </div>
                  <div className="flex gap-3">
                    {colorOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setPrimaryColor(option.id)}
                        className={`size-8 rounded-full ${option.bgClass} transition-all hover:scale-110 flex items-center justify-center ${
                          primaryColor === option.id
                            ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110'
                            : ''
                        }`}
                        title={option.id.charAt(0).toUpperCase() + option.id.slice(1)}
                      >
                         {primaryColor === option.id && <span className="material-symbols-outlined text-white text-base">check</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
    }
  };

  const menuItems: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'General', icon: 'tune', label: t.settings.tabs.general },
    { id: 'Profile', icon: 'account_circle', label: t.settings.tabs.profile },
    { id: 'Users', icon: 'group', label: t.settings.tabs.team },
    { id: 'Tags', icon: 'label', label: language === 'en' ? 'Tag Management' : '标签管理' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-background-dark shrink-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold">{t.settings.title}</h2>
          <p className="text-xs text-gray-500 mt-1">{t.settings.subtitle}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-md border border-gray-100 dark:border-gray-700'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 bg-white dark:bg-[#0c1419] overflow-y-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto py-12 px-8 lg:px-16">
          {renderTabContent()}

          <div className="flex justify-end gap-3 pt-12 mt-12 border-t border-gray-100 dark:border-gray-800">
            <button className="px-6 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{t.settings.discard}</button>
            <button className="px-6 py-2 text-sm font-medium rounded-lg transition-all shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90">
              {t.settings.save}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
