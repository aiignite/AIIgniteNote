import React from 'react';

interface Template {
  id: string;
  icon: string;
  name: string;
  systemPrompt: string;
}

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-500">library_add</span>
            从模板创建对话
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl text-left transition-all hover:scale-[1.02] group"
            >
              <div className="text-3xl mb-2">{template.icon}</div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-violet-600">{template.name}</h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.systemPrompt}</p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 text-center">
            💡 选择模板快速开始特定场景的对话
          </p>
        </div>
      </div>
    </div>
  );
};
