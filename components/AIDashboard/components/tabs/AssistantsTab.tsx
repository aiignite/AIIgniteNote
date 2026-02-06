import React, { useState } from 'react';

interface Assistant {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar?: string;
  category?: string;
  model?: string;
  isDefault?: boolean;
  isCustom?: boolean;
  isSystem?: boolean;
}

interface AssistantsTabProps {
  assistants: Assistant[];
  onAddAssistant: () => void;
  onEditAssistant: (assistant: Assistant) => void;
  onDeleteAssistant: (assistantId: string) => void;
  onSetDefaultAssistant: (assistantId: string) => void;
  onSelectAssistant: (assistant: Assistant) => void;
}

export const AssistantsTab: React.FC<AssistantsTabProps> = ({
  assistants,
  onAddAssistant,
  onEditAssistant,
  onDeleteAssistant,
  onSetDefaultAssistant,
  onSelectAssistant
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
      {/* 标题栏 - 添加新增按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Specialized Assistants</h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
          </div>
        </div>
        <button
          onClick={onAddAssistant}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Create Assistant
        </button>
      </div>

      {assistants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">smart_toy</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Assistants Available</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            You haven't created any AI assistants yet. Click the button below to create your first custom assistant with a specialized role.
          </p>
          <button
            onClick={onAddAssistant}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Create Your First Assistant
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map(agent => (
            <div key={agent.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer text-center group relative">
              {/* 编辑/删除/设为默认按钮 - 悬停显示 */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {!agent.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefaultAssistant(agent.id);
                    }}
                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-yellow-500 hover:text-white rounded-lg transition-colors shadow-sm"
                    title="Set as Default"
                  >
                    <span className="material-symbols-outlined text-sm">star</span>
                  </button>
                )}
                {!agent.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAssistant(agent);
                    }}
                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                    title="Edit assistant"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                )}
                {agent.isCustom && !agent.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAssistant(agent.id);
                    }}
                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm"
                    title="Delete assistant"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>

              {/* 状态标签 */}
              <div className="absolute top-4 left-4 flex flex-col gap-1">
                {agent.isDefault && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">star</span>
                    Default
                  </span>
                )}
                {agent.isSystem ? (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg self-start">
                    System
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg self-start">
                    Custom
                  </span>
                )}
              </div>

              <div className="size-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4 mt-4">
                <span className="material-symbols-outlined text-4xl text-primary">{agent.avatar || 'smart_toy'}</span>
              </div>
              <h3 className="text-lg font-bold">{agent.name}</h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 mt-1">{agent.role}</span>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6">{agent.description}</p>
              <button
                onClick={() => onSelectAssistant(agent)}
                className="w-full py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all opacity-0 group-hover:opacity-100"
              >
                Chat with {agent.name.split(' ')[0]}
              </button>
              {/* 非悬停状态下的 Start Chat 按钮 */}
              <button
                className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold group-hover:hidden transition-all"
              >
                Select Assistant
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Assistant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Model</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assistants.map(agent => (
                <tr key={agent.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">{agent.avatar || 'smart_toy'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{agent.name}</span>
                          {agent.isDefault && (
                            <span className="material-symbols-outlined text-yellow-500 text-sm">star</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{agent.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase">
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{agent.category || 'General'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{agent.model || 'Default'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onSelectAssistant(agent)}
                        className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors mr-2 opacity-0 group-hover:opacity-100"
                      >
                        Chat
                      </button>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        {!agent.isDefault && (
                          <button
                            onClick={() => onSetDefaultAssistant(agent.id)}
                            className="p-1.5 hover:bg-yellow-500/10 hover:text-yellow-500 rounded-lg transition-colors"
                            title="Set as Default"
                          >
                            <span className="material-symbols-outlined text-sm">star</span>
                          </button>
                        )}
                        {!agent.isSystem && (
                          <button
                            onClick={() => onEditAssistant(agent)}
                            className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                        )}
                        {agent.isCustom && !agent.isSystem && (
                          <button
                            onClick={() => onDeleteAssistant(agent.id)}
                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
