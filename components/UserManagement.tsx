
import React from 'react';
import { AppUser } from '../types';

const MOCK_USERS: AppUser[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@example.com', role: 'Owner', status: 'Active', avatar: 'https://picsum.photos/seed/alex/100/100' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Admin', status: 'Active', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: '3', name: 'Michael Ross', email: 'mike@example.com', role: 'Editor', status: 'Active', avatar: 'https://picsum.photos/seed/mike/100/100' },
  { id: '4', name: 'Emma Wilson', email: 'emma@example.com', role: 'Viewer', status: 'Pending', avatar: 'https://picsum.photos/seed/emma/100/100' },
];

const UserManagement: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0c1419] overflow-hidden">
      <header className="h-20 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 shrink-0 bg-gray-50/30 dark:bg-[#111c22]">
        <div>
          <h1 className="text-xl font-bold">Team Management</h1>
          <p className="text-xs text-gray-500">Manage access and roles for your workspace members</p>
        </div>
        <button className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined">person_add</span> Invite Member
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-bold rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700">Role: All</button>
              <button className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-bold rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700">Status: All</button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
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
                        <img src={user.avatar} className="size-10 rounded-full border-2 border-white dark:border-gray-800" alt={user.name} />
                        <div>
                          <p className="text-sm font-bold">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        user.role === 'Owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
