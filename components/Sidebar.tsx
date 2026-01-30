
import React, { useState, useId } from 'react';
import { ViewState } from '../types';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
  syncStatus?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout, syncStatus }) => {
  const [showQuickProfile, setShowQuickProfile] = useState(false);
  const baseId = useId(); 
  const { getTheme } = useThemeStore();
  const theme = getTheme();
  const { t } = useLanguageStore();

  const navItems: { id: ViewState; icon: string; label: string; activeColor?: string }[] = [
    { id: 'editor', icon: 'edit_note', label: t.sidebar.documents, activeColor: 'bg-primary' },
    { id: 'templates', icon: 'extension', label: t.sidebar.templates },
    { id: 'ai-dashboard', icon: 'auto_awesome', label: t.sidebar.aiDashboard },
    { id: 'trash', icon: 'delete', label: t.sidebar.trash },
  ];

  return (
    <aside className="w-16 flex flex-col items-center py-6 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15232a] shrink-0 relative">
      {/* Brand Logo - Dynamic Theme Color */}
      <div className="mb-10 group cursor-pointer" onClick={() => onViewChange('editor')}>
        <div className={`size-12 rounded-[10px] overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-300 shadow-${theme.name.toLowerCase()}-900/20`}>
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${baseId}-bg-gradient`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={theme.gradientStart}/>
                <stop offset="100%" stopColor={theme.gradientEnd}/>
              </linearGradient>
              
              <radialGradient id={`${baseId}-halo-gradient`} cx="100" cy="110" r="60" gradientUnits="userSpaceOnUse">
                <stop offset="20%" stopColor="white" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="white" stopOpacity="0"/>
              </radialGradient>
            </defs>

            <rect width="200" height="200" rx="40" fill={`url(#${baseId}-bg-gradient)`}/>

            <path d="M100 148 
                     C 65 148, 55 115, 80 85 
                     C 95 65, 125 55, 105 25 
                     C 135 55, 150 95, 130 125 
                     C 120 142, 115 148, 100 148Z" 
                  fill={`url(#${baseId}-halo-gradient)`} />

            <mask id={`${baseId}-modern-fire-mask`}>
              <path d="M100 142 
                       C 78 142, 70 115, 88 92 
                       C 98 80, 115 65, 105 40 
                       C 128 65, 138 100, 122 128 
                       C 115 140, 110 142, 100 142Z" 
                    fill="white" />
              <path d="M101 142 
                       C 94 130, 92 115, 96 100 
                       C 100 85, 108 75, 106 40
                       H 102
                       C 104 75, 96 85, 92 100
                       C 88 115, 90 130, 97 142
                       Z" 
                    fill="black" />
            </mask>

            <path d="M100 142 
                     C 78 142, 70 115, 88 92 
                     C 98 80, 115 65, 105 40 
                     C 128 65, 138 100, 122 128 
                     C 115 140, 110 142, 100 142Z" 
                  fill="white" 
                  mask={`url(#${baseId}-modern-fire-mask)`} />

            <path d="M70 160 C 90 165, 110 165, 130 160" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  opacity="0.4" />
            
            <circle cx="100.5" cy="138" r="3" fill="white" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
              currentView === item.id 
                ? (item.activeColor ? `${item.activeColor} text-white` : 'bg-primary/10 text-primary') 
                : 'text-gray-400 hover:text-primary'
            }`}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
          </button>
        ))}

        {syncStatus && (
          <div className="mt-4">
            {syncStatus}
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-6 items-center relative">
        <button 
          onClick={() => onViewChange('settings')}
          className={`p-2 rounded-lg transition-colors ${currentView === 'settings' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-primary'}`}
          title={t.sidebar.settings}
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
        
        <div className="relative">
          <div
            onClick={() => setShowQuickProfile(!showQuickProfile)}
            className="size-8 rounded-full border-2 border-primary cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all relative flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20"
          >
             <span className="material-symbols-outlined text-primary text-lg">person</span>
          </div>

          {showQuickProfile && (
            <div className="absolute bottom-0 left-12 w-64 bg-white dark:bg-[#1c2b33] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 z-[100] animate-in slide-in-from-left-2 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                   <span className="material-symbols-outlined text-primary text-2xl">person</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Alex Johnson</h4>
                  <p className="text-[10px] text-gray-500">Pro Account • Owner</p>
                </div>
              </div>
              <div className="space-y-1">
                <button 
                  onClick={() => { onViewChange('settings'); setShowQuickProfile(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">person</span> {t.sidebar.viewProfile}
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-red-500"
                >
                  <span className="material-symbols-outlined text-sm">logout</span> {t.sidebar.signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
