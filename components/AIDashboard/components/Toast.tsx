/**
 * Toast - 轻量级通知组件
 * 用于显示操作反馈、成功/错误消息等
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback,
  useEffect,
} from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toast Provider - 包装应用以提供 Toast 功能
 */
interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    setToasts((prev) => {
      const newToasts = [...prev, { id, type, message, duration }];
      // 限制最大数量
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });

    // 自动移除
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [maxToasts, removeToast]);

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration);
  }, [addToast]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast 容器 */}
      <div className={`fixed z-[100] flex flex-col gap-2 ${positionClasses[position]}`}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * 单个 Toast 项
 */
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 200);

      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
      icon: 'check_circle',
      iconColor: 'text-green-600 dark:text-green-400',
      text: 'text-green-800 dark:text-green-200',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      icon: 'error',
      iconColor: 'text-red-600 dark:text-red-400',
      text: 'text-red-800 dark:text-red-200',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'warning',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'info',
      iconColor: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-800 dark:text-blue-200',
    },
  };

  const styles = typeStyles[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        min-w-[280px] max-w-[400px]
        ${styles.bg} ${styles.border}
        ${isExiting ? 'animate-out fade-out slide-out-to-right' : 'animate-in fade-in slide-in-from-right'}
        transition-all duration-200
      `}
      role="alert"
    >
      <span className={`material-symbols-outlined ${styles.iconColor}`}>
        {styles.icon}
      </span>
      <p className={`flex-1 text-sm ${styles.text}`}>{toast.message}</p>
      <button
        onClick={onClose}
        className={`p-1 rounded hover:bg-black/10 transition-colors ${styles.text}`}
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};

/**
 * 使用 Toast 的 Hook
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * 独立 Toast 组件（不需要 Provider）
 */
interface StandaloneToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const StandaloneToast: React.FC<StandaloneToastProps> = ({
  type,
  message,
  visible,
  onClose,
  position = 'bottom-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (!visible) return null;

  return (
    <div className={`fixed z-[100] ${positionClasses[position]}`}>
      <ToastItem 
        toast={{ id: 'standalone', type, message }} 
        onClose={onClose} 
      />
    </div>
  );
};

export default ToastProvider;
