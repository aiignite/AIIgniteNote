import React from 'react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const keyboardShortcuts = {
  conversation: [
    { keys: ['Enter'], desc: '发送消息' },
    { keys: ['Shift', 'Enter'], desc: '换行' },
    { keys: ['Escape'], desc: '停止生成 / 关闭弹窗' },
    { keys: ['⌘/Ctrl', 'K'], desc: '聚焦输入框' },
    { keys: ['⌘/Ctrl', 'Shift', 'F'], desc: '搜索对话' },
    { keys: ['⌘/Ctrl', '/'], desc: '显示/隐藏快捷键帮助' },
  ],
  messageActions: [
    { icon: 'content_copy', desc: '复制消息内容' },
    { icon: 'translate', desc: '翻译消息' },
    { icon: 'refresh', desc: '重新生成回答' },
    { icon: 'edit', desc: '编辑消息' },
    { icon: 'bookmark', desc: '添加书签' },
    { icon: 'star', desc: '评分回答' },
    { icon: 'push_pin', desc: '置顶消息' },
    { icon: 'format_quote', desc: '引用回复' },
    { icon: 'call_split', desc: '创建对话分支' },
  ]
};

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">keyboard</span>
            键盘快捷键
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">对话操作</h4>
            <div className="space-y-2">
              {keyboardShortcuts.conversation.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, i) => (
                      <React.Fragment key={i}>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          {key}
                        </kbd>
                        {i < item.keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">消息操作</h4>
            <div className="space-y-2">
              {keyboardShortcuts.messageActions.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <span className="material-symbols-outlined text-sm text-gray-400">{item.icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <span className="text-xs text-gray-400">按 Escape 或点击外部关闭</span>
        </div>
      </div>
    </div>
  );
};
