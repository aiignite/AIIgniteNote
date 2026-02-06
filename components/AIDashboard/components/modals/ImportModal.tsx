import React from 'react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jsonText: string) => boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  if (!isOpen) return null;

  const handleImport = () => {
    const input = document.getElementById('import-json-input') as HTMLTextAreaElement;
    if (input && onImport(input.value)) {
      input.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500">upload_file</span>
            导入对话
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            粘贴 JSON 格式的对话数据：
          </p>
          <textarea
            className="w-full h-40 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={`{
  "title": "对话标题",
  "messages": [
    { "role": "user", "content": "用户消息" },
    { "role": "model", "content": "AI回复" }
  ]
}`}
            id="import-json-input"
          />
          <div className="mt-2 text-xs text-gray-400">
            支持格式：包含 title 和 messages 数组的 JSON 对象
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            导入
          </button>
        </div>
      </div>
    </div>
  );
};
