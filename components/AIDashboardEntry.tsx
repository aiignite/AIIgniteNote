/**
 * AIDashboard 统一入口
 * 
 * 支持在原版和重构版之间切换
 * 默认使用原版以保持兼容性
 */

import React, { useState, useEffect } from 'react';

// 原版组件 (默认)
import OriginalAIDashboard from './AIDashboard';

// 重构版组件 (懒加载)
const RefactoredAIDashboard = React.lazy(() => 
  import('./AIDashboard/AIDashboardRefactored').then(module => ({
    default: module.AIDashboardRefactored
  }))
);

// 版本切换 Key
const VERSION_KEY = 'ai-dashboard-version';

export type DashboardVersion = 'original' | 'refactored';

interface AIDashboardWrapperProps {
  /** 强制使用指定版本，忽略用户设置 */
  forceVersion?: DashboardVersion;
  /** 显示版本切换按钮 */
  showVersionToggle?: boolean;
}

/**
 * AIDashboard 包装组件
 * 支持版本切换
 */
export const AIDashboardWrapper: React.FC<AIDashboardWrapperProps> = ({
  forceVersion,
  showVersionToggle = false,
}) => {
  const [version, setVersion] = useState<DashboardVersion>(() => {
    if (forceVersion) return forceVersion;
    
    try {
      const saved = localStorage.getItem(VERSION_KEY);
      return (saved as DashboardVersion) || 'original';
    } catch {
      return 'original';
    }
  });

  // 保存版本选择
  useEffect(() => {
    if (!forceVersion) {
      try {
        localStorage.setItem(VERSION_KEY, version);
      } catch (e) {
        console.warn('Failed to save dashboard version preference');
      }
    }
  }, [version, forceVersion]);

  // 切换版本
  const toggleVersion = () => {
    setVersion(prev => prev === 'original' ? 'refactored' : 'original');
  };

  const effectiveVersion = forceVersion || version;

  return (
    <div className="relative h-full">
      {/* 版本切换按钮 (开发模式可见) */}
      {showVersionToggle && (
        <div className="absolute top-2 right-2 z-50">
          <button
            onClick={toggleVersion}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              effectiveVersion === 'refactored'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={`当前: ${effectiveVersion === 'original' ? '原版' : '重构版'}`}
          >
            {effectiveVersion === 'original' ? '🔄 切换到重构版' : '✅ 重构版'}
          </button>
        </div>
      )}

      {/* 渲染对应版本 */}
      {effectiveVersion === 'refactored' ? (
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">加载重构版...</span>
            </div>
          </div>
        }>
          <RefactoredAIDashboard />
        </React.Suspense>
      ) : (
        <OriginalAIDashboard />
      )}
    </div>
  );
};

/**
 * 默认导出原版组件，保持向后兼容
 * 
 * 使用方式:
 * - 直接导入使用原版: import AIDashboard from './components/AIDashboardEntry'
 * - 使用包装器切换: import { AIDashboardWrapper } from './components/AIDashboardEntry'
 */
export default OriginalAIDashboard;
