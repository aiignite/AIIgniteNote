import React from 'react';

interface ModelItem {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  usageCount?: number;
}

interface ModelQuickSwitcherProps {
  currentModelLabel: string;
  currentModelId?: string;
  models: ModelItem[];
  frequentModels: ModelItem[];
  modelUsageHistory: Record<string, number>;
  onSelectModel: (model: ModelItem) => void;
  onViewAllModels: () => void;
}

/**
 * 模型快速切换下拉菜单组件
 * 显示在输入栏上方，允许快速切换 AI 模型
 */
export const ModelQuickSwitcher: React.FC<ModelQuickSwitcherProps> = ({
  currentModelLabel,
  currentModelId,
  models,
  frequentModels,
  modelUsageHistory,
  onSelectModel,
  onViewAllModels,
}) => {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-sm">smart_toy</span>
        <span>{currentModelLabel}</span>
        <span className="material-symbols-outlined text-xs">expand_more</span>
      </button>
      {/* 模型下拉列表 */}
      <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-80 overflow-y-auto">
        {/* 常用模型区域 */}
        {frequentModels.length > 0 && (
          <>
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10">
              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">star</span>
                常用模型
              </span>
            </div>
            {frequentModels.map((model) => (
              <button
                key={`freq-${model.id}`}
                onClick={() => onSelectModel(model)}
                className={`w-full flex items-center gap-2 p-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors ${
                  currentModelId === model.modelId ? 'bg-primary/10' : ''
                }`}
              >
                <span className="material-symbols-outlined text-sm text-amber-500">
                  {currentModelId === model.modelId ? 'check_circle' : 'star'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{model.name}</p>
                  <p className="text-xs text-gray-400">{model.provider}</p>
                </div>
                <span className="text-[10px] text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                  {model.usageCount}次
                </span>
              </button>
            ))}
          </>
        )}
        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500">
            {frequentModels.length > 0 ? '全部模型' : '快速切换模型'}
          </span>
        </div>
        {models.slice(0, 10).map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model)}
            className={`w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              currentModelId === model.modelId ? 'bg-primary/10' : ''
            }`}
          >
            <span className="material-symbols-outlined text-sm text-primary">
              {currentModelId === model.modelId ? 'check_circle' : 'smart_toy'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{model.name}</p>
              <p className="text-xs text-gray-400">{model.provider}</p>
            </div>
            {modelUsageHistory[model.modelId] && (
              <span className="text-[10px] text-gray-400">
                {modelUsageHistory[model.modelId]}次
              </span>
            )}
          </button>
        ))}
        {models.length > 10 && (
          <button
            onClick={onViewAllModels}
            className="w-full p-2 text-xs text-primary hover:bg-primary/10 border-t border-gray-100 dark:border-gray-700"
          >
            查看全部 {models.length} 个模型 →
          </button>
        )}
      </div>
    </div>
  );
};
