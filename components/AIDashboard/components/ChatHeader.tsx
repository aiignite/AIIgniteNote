/**
 * ChatHeader - 聊天头部组件
 * 显示当前对话信息、模型选择、操作按钮等
 */

import React, { useState, useRef, useEffect } from 'react';
import { AIModel, AIAssistant, AIConversation } from '../types';

interface ChatHeaderProps {
  // 当前对话
  conversation?: AIConversation | null;
  
  // 模型/助手
  currentModel?: AIModel | null;
  currentAssistant?: AIAssistant | null;
  modelLabel?: string;
  
  // 操作回调
  onNewChat?: () => void;
  onClearChat?: () => void;
  onExport?: (format: 'json' | 'markdown' | 'txt' | 'html') => void;
  onShare?: () => void;
  onSettings?: () => void;
  onToggleSidebar?: () => void;
  onRename?: (newTitle: string) => void;
  
  // 状态
  isLoading?: boolean;
  messageCount?: number;
  
  // 显示选项
  showSidebar?: boolean;
  showModelInfo?: boolean;
  showAssistantInfo?: boolean;
  compact?: boolean;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentModel,
  currentAssistant,
  modelLabel,
  onNewChat,
  onClearChat,
  onExport,
  onShare,
  onSettings,
  onToggleSidebar,
  onRename,
  isLoading = false,
  messageCount = 0,
  showSidebar = true,
  showModelInfo = true,
  showAssistantInfo = true,
  compact = false,
  className = '',
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 编辑模式聚焦
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // 开始编辑标题
  const startEditing = () => {
    if (!onRename) return;
    setEditTitle(conversation?.title || '新对话');
    setIsEditing(true);
  };

  // 保存标题
  const saveTitle = () => {
    if (onRename && editTitle.trim()) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
  };

  // 导出格式列表
  const exportFormats: Array<{ format: 'json' | 'markdown' | 'txt' | 'html'; label: string; icon: string }> = [
    { format: 'markdown', label: 'Markdown', icon: 'description' },
    { format: 'json', label: 'JSON', icon: 'data_object' },
    { format: 'txt', label: '纯文本', icon: 'text_fields' },
    { format: 'html', label: 'HTML', icon: 'code' },
  ];

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 左侧：侧边栏切换 + 标题 */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* 侧边栏切换按钮 */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={showSidebar ? '隐藏侧边栏' : '显示侧边栏'}
          >
            <span className="material-symbols-outlined">
              {showSidebar ? 'menu_open' : 'menu'}
            </span>
          </button>
        )}

        {/* 对话标题 */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') cancelEditing();
              }}
              className="text-lg font-semibold bg-transparent border-b-2 border-primary outline-none text-gray-900 dark:text-white max-w-[200px]"
            />
          ) : (
            <h1 
              className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white truncate max-w-[200px] ${onRename ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={onRename ? startEditing : undefined}
              title={conversation?.title || '新对话'}
            >
              {conversation?.title || '新对话'}
            </h1>
          )}
          
          {/* 消息数量 */}
          {messageCount > 0 && !compact && (
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {messageCount} 条消息
            </span>
          )}
          
          {/* 加载指示器 */}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* 中间：模型/助手信息 */}
      {(showModelInfo || showAssistantInfo) && !compact && (
        <div className="flex items-center gap-2 mx-4">
          {/* 当前助手 */}
          {showAssistantInfo && currentAssistant && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {currentAssistant.avatar ? (
                <span className="text-sm">{currentAssistant.avatar}</span>
              ) : (
                <span className="material-symbols-outlined text-sm text-gray-500">smart_toy</span>
              )}
              <span className="text-xs text-gray-600 dark:text-gray-300">{currentAssistant.name}</span>
            </div>
          )}
          
          {/* 当前模型 */}
          {showModelInfo && (currentModel || modelLabel) && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="material-symbols-outlined text-sm text-gray-500">psychology</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {currentModel?.name || modelLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1">
        {/* 新建对话 */}
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="新建对话"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        )}

        {/* 导出 */}
        {onExport && (
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="导出对话"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                {exportFormats.map(({ format, label, icon }) => (
                  <button
                    key={format}
                    onClick={() => {
                      onExport(format);
                      setShowExportMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 分享 */}
        {onShare && (
          <button
            onClick={onShare}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="分享对话"
          >
            <span className="material-symbols-outlined">share</span>
          </button>
        )}

        {/* 更多操作 */}
        <div ref={moreMenuRef} className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="更多操作"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          
          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              {/* 重命名 */}
              {onRename && (
                <button
                  onClick={() => {
                    startEditing();
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  重命名
                </button>
              )}
              
              {/* 设置 */}
              {onSettings && (
                <button
                  onClick={() => {
                    onSettings();
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  对话设置
                </button>
              )}
              
              {/* 分隔线 */}
              {onClearChat && (
                <>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                  
                  {/* 清空对话 */}
                  <button
                    onClick={() => {
                      if (confirm('确定要清空当前对话吗？')) {
                        onClearChat();
                      }
                      setShowMoreMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    清空对话
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
