/**
 * MessageActions - 消息操作组件
 * 提供复制、编辑、删除、重新生成等操作
 */

import React, { useState, useRef, useEffect } from 'react';

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: 'user' | 'model';
  isBookmarked?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onToggleBookmark?: () => void;
  onInsertToEditor?: () => void;
  position?: 'top' | 'bottom';
  visible?: boolean;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}) => {
  const baseClass = 'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors';
  const variantClass = variant === 'danger'
    ? 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30'
    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${disabledClass}`}
      title={label}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  role,
  isBookmarked = false,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onToggleBookmark,
  onInsertToEditor,
  position = 'bottom',
  visible = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleDelete = () => {
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      // 3秒后自动取消确认状态
      deleteTimeoutRef.current = setTimeout(() => {
        setShowConfirmDelete(false);
      }, 3000);
    } else {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setShowConfirmDelete(false);
      onDelete?.();
    }
  };

  const cancelDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setShowConfirmDelete(false);
  };

  if (!visible) return null;

  const positionClass = position === 'top' ? 'mb-1' : 'mt-1';

  return (
    <div className={`flex items-center gap-1 ${positionClass} flex-wrap`}>
      {/* 复制 */}
      <ActionButton
        icon={copied ? 'check' : 'content_copy'}
        label={copied ? '已复制' : '复制'}
        onClick={handleCopy}
      />

      {/* 收藏 */}
      {onToggleBookmark && (
        <ActionButton
          icon={isBookmarked ? 'bookmark' : 'bookmark_border'}
          label={isBookmarked ? '取消收藏' : '收藏'}
          onClick={onToggleBookmark}
        />
      )}

      {/* 用户消息可编辑 */}
      {role === 'user' && onEdit && (
        <ActionButton
          icon="edit"
          label="编辑"
          onClick={onEdit}
        />
      )}

      {/* AI 消息可重新生成 */}
      {role === 'model' && onRegenerate && (
        <ActionButton
          icon="refresh"
          label="重新生成"
          onClick={onRegenerate}
        />
      )}

      {/* 插入到编辑器 */}
      {role === 'model' && onInsertToEditor && (
        <ActionButton
          icon="add_to_photos"
          label="插入笔记"
          onClick={onInsertToEditor}
        />
      )}

      {/* 删除按钮 */}
      {onDelete && (
        showConfirmDelete ? (
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 rounded px-1">
            <button
              onClick={handleDelete}
              className="text-xs text-red-600 dark:text-red-400 px-1 py-0.5 hover:underline"
            >
              确认删除?
            </button>
            <button
              onClick={cancelDelete}
              className="text-xs text-gray-500 px-1 py-0.5 hover:underline"
            >
              取消
            </button>
          </div>
        ) : (
          <ActionButton
            icon="delete"
            label="删除"
            onClick={handleDelete}
            variant="danger"
          />
        )
      )}
    </div>
  );
};

/**
 * 快速操作栏 - 悬浮在消息上的操作按钮
 */
interface QuickActionsBarProps {
  onCopy: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onCopy,
  onBookmark,
  isBookmarked = false,
  showRegenerate = false,
  onRegenerate,
}) => {
  return (
    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded shadow-md border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={onCopy}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="复制"
      >
        <span className="material-symbols-outlined text-sm text-gray-500">content_copy</span>
      </button>
      {onBookmark && (
        <button
          onClick={onBookmark}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={isBookmarked ? '取消收藏' : '收藏'}
        >
          <span className={`material-symbols-outlined text-sm ${isBookmarked ? 'text-yellow-500' : 'text-gray-500'}`}>
            {isBookmarked ? 'bookmark' : 'bookmark_border'}
          </span>
        </button>
      )}
      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="重新生成"
        >
          <span className="material-symbols-outlined text-sm text-gray-500">refresh</span>
        </button>
      )}
    </div>
  );
};

export default MessageActions;
