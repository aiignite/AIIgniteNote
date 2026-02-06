import React from 'react';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  inputText: string;
  onSave: () => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  templateName,
  onTemplateNameChange,
  inputText,
  onSave
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    onTemplateNameChange('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">bookmark_add</span>
            保存为模板
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              模板名称
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="例如：代码审查提示"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim()) {
                  onSave();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              提示内容预览
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
              {inputText}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={!templateName.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            保存模板
          </button>
        </div>
      </div>
    </div>
  );
};
