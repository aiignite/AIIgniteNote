import React from 'react';

interface Message {
  text: string;
  role?: string;
}

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareMessages: [number, number] | null;
  messages: Message[];
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  compareMessages,
  messages
}) => {
  if (!isOpen || !compareMessages || !messages[compareMessages[0]] || !messages[compareMessages[1]]) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">compare</span>
            消息比对
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">message</span>
              消息 #{compareMessages[0] + 1}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm whitespace-pre-wrap">
              {messages[compareMessages[0]].text}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">message</span>
              消息 #{compareMessages[1] + 1}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm whitespace-pre-wrap">
              {messages[compareMessages[1]].text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
