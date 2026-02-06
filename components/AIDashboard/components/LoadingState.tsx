/**
 * LoadingState - 加载状态组件集合
 * 提供各种加载中的视觉反馈
 */

import React from 'react';

/**
 * 加载动画 - 三个跳动的点
 */
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'bg-primary',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${sizeClasses[size]} ${color} rounded-full animate-bounce`}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
};

/**
 * 加载动画 - 旋转环
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-primary',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} ${color} ${className}`}>
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

/**
 * 骨架屏 - 用于内容加载占位
 */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        ${roundedClasses[rounded]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  );
};

/**
 * 消息骨架屏
 */
interface MessageSkeletonProps {
  isUser?: boolean;
  lines?: number;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({
  isUser = false,
  lines = 3,
}) => {
  return (
    <div className={`flex gap-3 p-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Skeleton width={32} height={32} rounded="full" />
      <div className={`flex-1 space-y-2 ${isUser ? 'items-end' : ''}`}>
        <Skeleton width="60%" height={16} />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} width={`${80 - i * 20}%`} height={16} />
        ))}
      </div>
    </div>
  );
};

/**
 * 对话列表骨架屏
 */
export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <Skeleton width={40} height={40} rounded="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={12} />
      </div>
    </div>
  );
};

/**
 * 全屏加载遮罩
 */
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = '加载中...',
  blur = true,
}) => {
  if (!visible) return null;

  return (
    <div
      className={`
        absolute inset-0 z-50
        flex flex-col items-center justify-center
        bg-white/80 dark:bg-gray-900/80
        ${blur ? 'backdrop-blur-sm' : ''}
      `}
    >
      <LoadingSpinner size="xl" />
      {text && (
        <p className="mt-4 text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
};

/**
 * AI 正在输入指示器
 */
interface TypingIndicatorProps {
  username?: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  username = 'AI',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      <span>{username} 正在输入</span>
      <LoadingDots size="sm" color="bg-gray-400" />
    </div>
  );
};

/**
 * 进度条
 */
interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  color?: string;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  color = 'bg-primary',
  height = 'md',
  className = '',
}) => {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClasses[height]}`}>
        <div
          className={`${color} ${heightClasses[height]} rounded-full transition-all duration-300`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {Math.round(clampedProgress)}%
        </p>
      )}
    </div>
  );
};

export default {
  LoadingDots,
  LoadingSpinner,
  Skeleton,
  MessageSkeleton,
  ConversationSkeleton,
  LoadingOverlay,
  TypingIndicator,
  ProgressBar,
};
