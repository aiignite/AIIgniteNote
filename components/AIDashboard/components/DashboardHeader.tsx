import React from 'react';

type TabType = 'Models' | 'Assistants' | 'Chat';

interface DashboardHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs: TabType[] = ['Models', 'Assistants', 'Chat'];

  return (
    <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
        <h2 className="text-lg font-bold">AI Dashboard</h2>
      </div>
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="w-24"></div> {/* Spacer for symmetry */}
    </header>
  );
};

export default DashboardHeader;
