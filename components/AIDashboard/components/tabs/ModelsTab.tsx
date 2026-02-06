import React, { useState } from 'react';

interface Model {
  id: string;
  name: string;
  desc: string;
  speed: string;
  context: string;
  cost: string;
  provider: string;
  isCustom?: boolean;
  defaultTemplateId?: string;
}

interface ModelsTabProps {
  models: Model[];
  loadingProviders: boolean;
  onAddModel: () => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
}

export const ModelsTab: React.FC<ModelsTabProps> = ({
  models,
  loadingProviders,
  onAddModel,
  onEditModel,
  onDeleteModel
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
      {/* 标题栏 - 添加新增按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Available Models</h2>
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
          onClick={onAddModel}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Add Model
        </button>
      </div>

      {loadingProviders ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-500">Loading models...</p>
          </div>
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">neurology</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Models Available</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            You haven't added any AI models yet. Click the button below to add your first custom model.
          </p>
          <button
            onClick={onAddModel}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Add Your First Model
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {models.map(model => (
            <div key={model.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group relative">
              {/* 编辑/删除按钮 - 悬停显示 */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditModel(model);
                  }}
                  className="p-1.5 bg-white dark:bg-gray-800 hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                  title="Edit model"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                {model.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteModel(model.id);
                    }}
                    className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm"
                    title="Delete model"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>

              <div className="flex justify-between items-start mb-4 pr-16">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">neurology</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-500">{model.speed}</span>
                  {model.isCustom && (
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">Custom</span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1">{model.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{model.desc}</p>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">memory</span> {model.context} Context</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">payments</span> {model.cost}</span>
                {model.defaultTemplateId && (
                  <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-sm">auto_awesome</span> Has Default Template</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Model Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Provider</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Speed</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Context</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model => (
                <tr key={model.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">neurology</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm">{model.name}</div>
                        {model.defaultTemplateId && (
                          <div className="text-[10px] text-primary flex items-center gap-0.5 mt-0.5">
                            <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                            Default Template active
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{model.speed}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{model.context}</span>
                  </td>
                  <td className="px-6 py-4">
                    {model.isCustom ? (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold">Custom</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-bold">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditModel(model)}
                        className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      {model.isCustom && (
                        <button
                          onClick={() => onDeleteModel(model.id)}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
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
