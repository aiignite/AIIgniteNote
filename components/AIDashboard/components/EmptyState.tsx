/**
 * EmptyState - 空状态提示组件
 * 用于显示各种空状态的提示信息
 */

import React from 'react';

interface EmptyStateProps {
  type?: 'chat' | 'search' | 'bookmark' | 'error' | 'custom';
  icon?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 预设配置
const presets: Record<string, { icon: string; title: string; description: string }> = {
  chat: {
    icon: 'chat_bubble_outline',
    title: '开始新对话',
    description: '发送消息开始与 AI 助手对话',
  },
  search: {
    icon: 'search_off',
    title: '未找到结果',
    description: '尝试使用不同的关键词搜索',
  },
  bookmark: {
    icon: 'bookmark_border',
    title: '暂无书签',
    description: '点击消息旁的书签图标添加书签',
  },
  error: {
    icon: 'error_outline',
    title: '出错了',
    description: '请稍后重试或刷新页面',
  },
  custom: {
    icon: 'info',
    title: '暂无内容',
    description: '',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'custom',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}) => {
  const preset = presets[type] || presets.custom;
  
  const sizeClasses = {
    sm: {
      container: 'py-6',
      iconWrapper: 'size-10 mb-2',
      icon: 'text-xl',
      title: 'text-sm',
      description: 'text-xs',
      button: 'px-3 py-1.5 text-xs',
    },
    md: {
      container: 'py-12',
      iconWrapper: 'size-14 mb-3',
      icon: 'text-2xl',
      title: 'text-base',
      description: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    lg: {
      container: 'py-16',
      iconWrapper: 'size-20 mb-4',
      icon: 'text-4xl',
      title: 'text-lg',
      description: 'text-base',
      button: 'px-5 py-2.5 text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${sizes.container} ${className}`}>
      {/* 图标 */}
      <div className={`${sizes.iconWrapper} rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
        <span className={`material-symbols-outlined ${sizes.icon} text-gray-400 dark:text-gray-500`}>
          {icon || preset.icon}
        </span>
      </div>

      {/* 标题 */}
      <h3 className={`${sizes.title} font-medium text-gray-600 dark:text-gray-400 mb-1`}>
        {title || preset.title}
      </h3>

      {/* 描述 */}
      {(description || preset.description) && (
        <p className={`${sizes.description} text-gray-400 dark:text-gray-500 max-w-xs`}>
          {description || preset.description}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 ${sizes.button} bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-1.5 transition-colors`}
        >
          {action.icon && (
            <span className="material-symbols-outlined text-lg">{action.icon}</span>
          )}
          {action.label}
        </button>
      )}

      {/* 次要操作 */}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className={`mt-2 ${sizes.button} text-primary hover:bg-primary/10 rounded-lg transition-colors`}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
};

// 快捷方式导出
export const ChatEmptyState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="chat" {...props} />
);

export const SearchEmptyState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="search" {...props} />
);

export const BookmarkEmptyState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="bookmark" {...props} />
);

export const ErrorEmptyState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="error" {...props} />
);
