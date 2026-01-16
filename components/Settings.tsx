
import React, { useState } from 'react';
import { AppUser, SettingsTab } from '../types';

const MOCK_USERS: AppUser[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@example.com', role: 'Owner', status: 'Active', avatar: 'https://picsum.photos/seed/alex/100/100' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Admin', status: 'Active', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: '3', name: 'Michael Ross', email: 'mike@example.com', role: 'Editor', status: 'Active', avatar: 'https://picsum.photos/seed/mike/100/100' },
  { id: '4', name: 'Emma Wilson', email: 'emma@example.com', role: 'Viewer', status: 'Pending', avatar: 'https://picsum.photos/seed/emma/100/100' },
];

interface SettingsProps {
  initialTab?: SettingsTab;
}

const Settings: React.FC<SettingsProps> = ({ initialTab = 'General' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Users':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Team Management</h2>
                <p className="text-sm text-gray-500 mt-1">Manage access and roles for your workspace members</p>
              </div>
              <button className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">person_add</span> Invite Member
              </button>
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
                  {MOCK_USERS.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} className="size-9 rounded-full border border-gray-100 dark:border-gray-700" alt={user.name} />
                          <div>
                            <p className="text-sm font-bold">{user.name}</p>
                            <p className="text-[10px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          user.role === 'Owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                          user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          <span className="text-xs">{user.status}</span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Profile':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold">User Profile</h2>
            <div className="flex items-start gap-8">
              <div className="relative group">
                <img src="https://picsum.photos/seed/user/200/200" className="size-32 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-xl" />
                <button className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                  <span className="material-symbols-outlined">photo_camera</span>
                </button>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input type="text" defaultValue="Alex Johnson" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 text-sm focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                    <input type="email" defaultValue="alex@example.com" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 text-sm focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Biography</label>
                  <textarea rows={3} defaultValue="Senior Product Designer and tech enthusiast." className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 text-sm focus:ring-1 focus:ring-primary resize-none" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Security':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold">Security & Access</h2>
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                <div>
                  <h4 className="font-bold">Two-Factor Authentication</h4>
                  <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                </div>
                <button className="size-12 rounded-full bg-gray-200 dark:bg-gray-700 relative flex items-center px-1 transition-colors">
                  <div className="size-5 bg-white rounded-full shadow-md"></div>
                </button>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Change Password</h4>
                <div className="grid gap-4">
                  <input type="password" placeholder="Current Password" className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 text-sm focus:ring-1 focus:ring-primary" />
                  <input type="password" placeholder="New Password" className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 text-sm focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'AI':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold">AI Configuration</h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Model</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 text-sm focus:ring-1 focus:ring-primary">
                  <option>Gemini 3 Pro (High Quality)</option>
                  <option>Gemini 3 Flash (Fastest)</option>
                  <option>Gemini 2.5 Pro (Balanced)</option>
                </select>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Creativity (Temperature)</label>
                  <span className="text-xs font-bold text-primary">0.7</span>
                </div>
                <input type="range" className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Precise</span>
                  <span>Creative</span>
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
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Appearance</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Interface Theme</p>
                    <p className="text-xs text-gray-500">Choose your preferred visual mode</p>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 shadow-sm rounded-md flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">light_mode</span> Light
                    </button>
                    <button className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">dark_mode</span> Dark
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Primary Accent Color</p>
                    <p className="text-xs text-gray-500">Change the primary color of the interface</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="size-6 rounded-full bg-primary ring-2 ring-offset-2 ring-primary"></button>
                    <button className="size-6 rounded-full bg-purple-500"></button>
                    <button className="size-6 rounded-full bg-emerald-500"></button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
    }
  };

  const menuItems: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'General', icon: 'tune', label: 'General' },
    { id: 'Profile', icon: 'account_circle', label: 'User Profile' },
    { id: 'Users', icon: 'group', label: 'Team Management' },
    { id: 'Security', icon: 'security', label: 'Security' },
    { id: 'AI', icon: 'auto_awesome', label: 'AI Configuration' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-background-dark shrink-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-xs text-gray-500 mt-1">Manage your account and preferences</p>
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
            <button className="px-6 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Discard</button>
            <button className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Save Changes</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
