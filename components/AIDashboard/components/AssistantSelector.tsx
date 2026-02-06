/**
 * AssistantSelector - 助手选择器组件
 * 展示和选择 AI 助手
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AIAssistant } from '../types';

interface AssistantSelectorProps {
  assistants: AIAssistant[];
  currentAssistantId: string;
  onSelectAssistant: (assistantId: string) => void;
  disabled?: boolean;
  className?: string;
  showAvatar?: boolean;
  compact?: boolean;
}

// 助手分类配置
const categoryConfig: Record<string, { icon: string; label: string; color: string }> = {
  writing: { icon: 'edit_note', label: '写作', color: 'text-blue-500' },
  coding: { icon: 'code', label: '编程', color: 'text-green-500' },
  analysis: { icon: 'analytics', label: '分析', color: 'text-purple-500' },
  creative: { icon: 'palette', label: '创意', color: 'text-pink-500' },
  research: { icon: 'science', label: '研究', color: 'text-orange-500' },
  general: { icon: 'smart_toy', label: '通用', color: 'text-gray-500' },
  custom: { icon: 'person', label: '自定义', color: 'text-cyan-500' },
};

export const AssistantSelector: React.FC<AssistantSelectorProps> = ({
  assistants,
  currentAssistantId,
  onSelectAssistant,
  disabled = false,
  className = '',
  showAvatar = true,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 当前选中的助手
  const currentAssistant = useMemo(() => {
    return assistants.find(a => a.id === currentAssistantId);
  }, [assistants, currentAssistantId]);

  // 所有分类
  const categories = useMemo(() => {
    const cats = new Set<string>();
    assistants.forEach(a => {
      if (a.category) cats.add(a.category.toLowerCase());
    });
    return Array.from(cats);
  }, [assistants]);

  // 过滤后的助手列表
  const filteredAssistants = useMemo(() => {
    let filtered = [...assistants];
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.role?.toLowerCase().includes(query)
      );
    }
    
    // 分类过滤
    if (selectedCategory) {
      filtered = filtered.filter(a => 
        a.category?.toLowerCase() === selectedCategory
      );
    }
    
    // 排序：系统助手优先，然后按使用次数
    filtered.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
    
    return filtered;
  }, [assistants, searchQuery, selectedCategory]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取分类配置
  const getCategoryConfig = (category?: string) => {
    return categoryConfig[category?.toLowerCase() || 'general'] || categoryConfig.general;
  };

  // 选择助手
  const handleSelect = (assistantId: string) => {
    onSelectAssistant(assistantId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // 渲染助手头像
  const renderAvatar = (assistant: AIAssistant, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-6 h-6 text-sm',
      md: 'w-8 h-8 text-base',
      lg: 'w-10 h-10 text-lg',
    };
    
    if (assistant.avatar && assistant.avatar.startsWith('http')) {
      return (
        <img 
          src={assistant.avatar} 
          alt={assistant.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      );
    }
    
    // 使用 emoji 或默认图标
    const config = getCategoryConfig(assistant.category);
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center`}>
        {assistant.avatar ? (
          <span>{assistant.avatar}</span>
        ) : (
          <span className={`material-symbols-outlined ${config.color}`} style={{ fontSize: 'inherit' }}>
            {config.icon}
          </span>
        )}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-2'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'ring-2 ring-primary border-primary' : ''}`}
      >
        {currentAssistant ? (
          <>
            {showAvatar && renderAvatar(currentAssistant, compact ? 'sm' : 'md')}
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-200 truncate max-w-[100px]`}>
              {currentAssistant.name}
            </span>
          </>
        ) : (
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400`}>
            选择助手
          </span>
        )}
        <span className={`material-symbols-outlined ${compact ? 'text-sm' : 'text-base'} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 max-h-[450px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索助手..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* 分类标签 */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  !selectedCategory 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {categories.map(cat => {
                const config = getCategoryConfig(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">{config.icon}</span>
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 助手列表 */}
          <div className="overflow-y-auto max-h-[300px]">
            {filteredAssistants.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                未找到匹配的助手
              </div>
            ) : (
              filteredAssistants.map(assistant => (
                <button
                  key={assistant.id}
                  onClick={() => handleSelect(assistant.id)}
                  className={`w-full flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                    assistant.id === currentAssistantId ? 'bg-primary/10' : ''
                  }`}
                >
                  {/* 头像 */}
                  {renderAvatar(assistant, 'lg')}
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {assistant.name}
                      </span>
                      {assistant.isSystem && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                          系统
                        </span>
                      )}
                      {assistant.isDefault && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                          默认
                        </span>
                      )}
                    </div>
                    
                    {/* 角色/描述 */}
                    {(assistant.role || assistant.description) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {assistant.role || assistant.description}
                      </div>
                    )}
                    
                    {/* 使用统计 */}
                    {assistant.usageCount > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <span className="material-symbols-outlined text-xs">chat</span>
                        已使用 {assistant.usageCount} 次
                      </div>
                    )}
                  </div>
                  
                  {/* 选中指示器 */}
                  {assistant.id === currentAssistantId && (
                    <span className="material-symbols-outlined text-primary self-center">
                      check_circle
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* 底部操作 */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={() => {
                setIsOpen(false);
                // 触发创建自定义助手回调
              }}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              创建自定义助手
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
