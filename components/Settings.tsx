
import React, { useState, useEffect } from 'react';
import { SettingsTab } from '../types';
import { useThemeStore, ThemeColor } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';

interface SettingsProps {
  initialTab?: SettingsTab;
  user?: { id: string; name?: string; email: string; image?: string } | null;
}

const Settings: React.FC<SettingsProps> = ({ initialTab = 'General', user }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { primaryColor, setPrimaryColor } = useThemeStore();
  const { language, setLanguage, t } = useLanguageStore();
  const { setUser, setIsAuthenticated } = useAuthStore();

  const [tags, setTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const profileName = profileForm.name || user?.name?.trim() || '';
  const profileEmail = profileForm.email || user?.email || '';
  const profileImage = user?.image || (user?.id ? `https://picsum.photos/seed/${user.id}/200/200` : '');

  useEffect(() => {
    setProfileForm({
      name: user?.name?.trim() || '',
      email: user?.email || ''
    });
  }, [user]);
  
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

  const handleUpdateProfile = async () => {
    try {
      const response = await api.updateProfile({ name: profileForm.name }) as any;
      if (response?.success) {
        // Update global auth store
        setUser(response.data);
        alert(language === 'zh' ? '个人资料更新成功' : 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(language === 'zh' ? '个人资料更新失败' : 'Failed to update profile');
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (!file) return;

    setAvatarUploading(true);
    try {
      const response = await api.uploadAvatar(file) as any;
      if (response?.success) {
        // Update global auth store
        setUser(response.data);
        alert(language === 'zh' ? '头像上传成功' : 'Avatar uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert(language === 'zh' ? '头像上传失败' : 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMsg = language === 'zh' 
      ? '您确定要删除您的账户吗？此操作是永久性的，且无法撤销。' 
      : 'Are you sure you want to delete your account? This action is permanent and cannot be undone.';
      
    if (!confirm(confirmMsg)) return;
    
    try {
      const response = await api.deleteAccount() as any;
      if (response?.success) {
        alert(language === 'zh' ? '您的账户已删除' : 'Your account has been deleted');
        setIsAuthenticated(false);
        setUser(null);
        // Tokens are usually cleared by logout/api class on 401, but we should clear if successful
        window.location.reload(); // Force reload to trigger login screen
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert(language === 'zh' ? '账户删除失败' : 'Failed to delete account');
    }
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

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !currentWorkspaceId) return;
    setMemberLoading(true);
    try {
      const response = await api.addWorkspaceMember(currentWorkspaceId, inviteEmail.trim(), inviteRole) as any;
      if (response?.success) {
        setInviteEmail('');
        setInviteRole('EDITOR');
        await loadWorkspaceMembers(currentWorkspaceId);
      } else {
        throw new Error(response?.message || 'Failed to invite member');
      }
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      alert(error?.message || 'Failed to invite member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    if (!currentWorkspaceId) return;
    setMemberActionId(memberId);
    try {
      const response = await api.updateWorkspaceMemberRole(currentWorkspaceId, memberId, role) as any;
      if (response?.success) {
        setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: response.data.role } : m));
      } else {
        throw new Error(response?.message || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      alert(error?.message || 'Failed to update member role');
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspaceId) return;
    setMemberActionId(memberId);
    try {
      const response = await api.removeWorkspaceMember(currentWorkspaceId, memberId) as any;
      if (response?.success) {
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      } else {
        throw new Error(response?.message || 'Failed to remove member');
      }
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      alert(error?.message || 'Failed to remove member');
    } finally {
      setMemberActionId(null);
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
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Team Members</h2>
                  <p className="text-xs text-gray-500 mt-1">精简管理当前工作区的成员与角色</p>
                </div>
                <div className="flex items-center gap-3">
                  {workspaces.length > 1 && (
                    <select
                      value={currentWorkspaceId}
                      onChange={(e) => setCurrentWorkspaceId(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary transition-all"
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="成员邮箱"
                      className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary transition-all w-48"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={handleInviteMember}
                      disabled={memberLoading}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-lg">person_add</span> 邀请
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as any)}
                            disabled={memberActionId === member.id || member.role === 'OWNER'}
                            className="bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-1 px-2 text-xs font-medium focus:ring-1 focus:ring-primary"
                          >
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs">Active</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={member.role === 'OWNER' || memberActionId === member.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
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
              <h2 className="text-2xl font-bold">{t.settings.profile.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.settings.profile.subtitle}</p>
            </div>

            {/* Personal Info Section */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative group shrink-0 mx-auto md:mx-0">
                {profileImage ? (
                  <img src={profileImage.startsWith('/uploads/') ? `${window.location.origin}${profileImage}` : profileImage} className="size-32 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-xl" alt="Profile" />
                ) : (
                  <div className="size-32 rounded-3xl border-4 border-white dark:border-gray-800 shadow-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{(profileName || profileEmail || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <button 
                  onClick={() => document.getElementById('avatar-input')?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined">photo_camera</span>
                  )}
                </button>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadAvatar(file);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex-1 w-full space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.fullNameLabel}</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.emailLabel}</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.bioLabel}</label>
                  <textarea rows={3} placeholder={t.settings.profile.bioPlaceholder} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary resize-none transition-all" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800"></div>

            {/* Security Section (Merged) */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.settings.profile.securityTitle}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.currentPassword}</label>
                   <input type="password" placeholder="••••••••" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div className="hidden md:block"></div> {/* Spacer */}

                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.newPassword}</label>
                   <input type="password" placeholder={t.settings.profile.newPassword} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.settings.profile.confirmPassword}</label>
                   <input type="password" placeholder={t.settings.profile.confirmPassword} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800 mt-6">
                <div>
                  <h4 className="font-bold text-sm">{t.settings.profile.twoFactorTitle}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{t.settings.profile.twoFactorDesc}</p>
                </div>
                <button className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors focus:outline-none">
                  <div className="absolute left-1 top-1 size-4 bg-white rounded-full shadow-sm transition-transform"></div>
                </button>
              </div>

              <div className="flex justify-start pt-2">
                  <button className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">logout</span> {t.settings.profile.logoutAll}
                 </button>
              </div>

              <div className="border-t border-red-100 dark:border-red-900/30 mt-12 pt-8">
                 <h3 className="text-lg font-bold text-red-600 dark:text-red-400">{t.settings.profile.dangerZone}</h3>
                 <p className="text-xs text-gray-500 mt-1">{t.settings.profile.dangerDesc}</p>
                 
                 <div className="mt-4 p-5 bg-red-50/50 dark:bg-red-900/5 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{t.settings.profile.deleteAccount}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{t.settings.profile.deleteAccountDesc}</p>
                    </div>
                    <button 
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      {t.settings.profile.deleteAccount}
                    </button>
                 </div>
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
            <button 
              onClick={() => {
                if (activeTab === 'Profile') handleUpdateProfile();
                else alert(language === 'zh' ? '设置已保存' : 'Settings saved');
              }}
              className="px-6 py-2 text-sm font-medium rounded-lg transition-all shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90"
            >
              {t.settings.save}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
