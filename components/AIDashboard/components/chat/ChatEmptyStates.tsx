import React from 'react';

interface ChatEmptyStatesProps {
  // 状态类型
  type: 'welcome' | 'no-search-results' | 'no-bookmarks';
  // 回调
  onQuickAction?: (text: string) => void;
  onClearSearch?: () => void;
  onShowAllMessages?: () => void;
}

export const ChatEmptyStates: React.FC<ChatEmptyStatesProps> = ({
  type,
  onQuickAction,
  onClearSearch,
  onShowAllMessages
}) => {
  if (type === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 animate-pulse">
          <span className="material-symbols-outlined text-5xl text-primary">auto_awesome</span>
        </div>
        <h3 className="text-2xl font-bold mb-3">开始与 AI 对话</h3>
        <p className="text-gray-500 mb-8 max-w-md">
          输入您的问题或选择下方的快捷操作开始对话。支持上传图片、PDF 等文件进行分析。
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[
            { icon: 'edit_note', label: '帮我写一篇文章' },
            { icon: 'lightbulb', label: '给我一些创意灵感' },
            { icon: 'summarize', label: '总结一篇文档' },
            { icon: 'code', label: '帮我写代码' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onQuickAction?.(item.label)}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:shadow-lg hover:border-primary/50 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-primary">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        {/* 拖拽提示 */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          <span>支持拖拽上传文件</span>
        </div>
      </div>
    );
  }

  if (type === 'no-search-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-gray-400">search_off</span>
        </div>
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">未找到匹配的消息</h3>
        <p className="text-sm text-gray-400">
          尝试使用其他关键词搜索
        </p>
        <button
          onClick={onClearSearch}
          className="mt-4 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          清除搜索
        </button>
      </div>
    );
  }

  if (type === 'no-bookmarks') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-yellow-400">bookmark_border</span>
        </div>
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">暂无书签消息</h3>
        <p className="text-sm text-gray-400">
          点击消息旁的书签图标添加书签
        </p>
        <button
          onClick={onShowAllMessages}
          className="mt-4 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          显示全部消息
        </button>
      </div>
    );
  }

  return null;
};
