import React from 'react';

interface SavedTemplate {
  id: string;
  name: string;
  prompt: string;
}

interface SavedTemplatesMenuProps {
  templates: SavedTemplate[];
  onUseTemplate: (prompt: string) => void;
  onDeleteTemplate: (id: string) => void;
}

/**
 * 我的模板下拉菜单组件
 * 显示用户保存的提示模板列表
 */
export const SavedTemplatesMenu: React.FC<SavedTemplatesMenuProps> = ({
  templates,
  onUseTemplate,
  onDeleteTemplate,
}) => {
  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-xs transition-all"
        title="我的模板"
      >
        <span className="material-symbols-outlined text-sm">folder_special</span>
        <span className="hidden sm:inline">模板</span>
        <span className="ml-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-[10px] rounded-full">
          {templates.length}
        </span>
      </button>
      {/* 模板下拉菜单 */}
      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-64 overflow-y-auto">
        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500">我的提示模板</span>
        </div>
        {templates.map((template) => (
          <div 
            key={template.id}
            className="flex items-start gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <button
              onClick={() => onUseTemplate(template.prompt)}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{template.name}</p>
              <p className="text-xs text-gray-400 line-clamp-1">{template.prompt}</p>
            </button>
            <button
              onClick={() => onDeleteTemplate(template.id)}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="删除模板"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
