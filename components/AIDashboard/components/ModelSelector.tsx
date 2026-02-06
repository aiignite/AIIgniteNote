/**
 * ModelSelector - 模型选择器组件
 * 下拉选择 AI 模型和提供商
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AIModel } from '../types';

interface ModelSelectorProps {
  models: AIModel[];
  currentModelId: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
  showProviderIcon?: boolean;
  compact?: boolean;
}

// 提供商图标和颜色配置
const providerConfig: Record<string, { icon: string; color: string; label: string }> = {
  gemini: { icon: '✨', color: 'text-blue-500', label: 'Google Gemini' },
  openai: { icon: '🤖', color: 'text-green-500', label: 'OpenAI' },
  claude: { icon: '🎭', color: 'text-purple-500', label: 'Anthropic Claude' },
  ollama: { icon: '🦙', color: 'text-orange-500', label: 'Ollama' },
  lmstudio: { icon: '🔬', color: 'text-cyan-500', label: 'LM Studio' },
  custom: { icon: '⚙️', color: 'text-gray-500', label: '自定义' },
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  currentModelId,
  onSelectModel,
  disabled = false,
  className = '',
  showProviderIcon = true,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 当前选中的模型
  const currentModel = useMemo(() => {
    return models.find(m => m.id === currentModelId);
  }, [models, currentModelId]);

  // 过滤后的模型列表
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase();
    return models.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.provider.toLowerCase().includes(query) ||
      m.modelId.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  // 按提供商分组
  const groupedModels = useMemo(() => {
    const groups: Record<string, AIModel[]> = {};
    
    filteredModels.forEach(model => {
      const provider = model.provider.toLowerCase();
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });
    
    return groups;
  }, [filteredModels]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // 获取提供商配置
  const getProviderConfig = (provider: string) => {
    return providerConfig[provider.toLowerCase()] || providerConfig.custom;
  };

  // 选择模型
  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
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
        {currentModel ? (
          <>
            {showProviderIcon && (
              <span className={`${compact ? 'text-sm' : ''} ${getProviderConfig(currentModel.provider).color}`}>
                {getProviderConfig(currentModel.provider).icon}
              </span>
            )}
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]`}>
              {currentModel.name}
            </span>
          </>
        ) : (
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400`}>
            选择模型
          </span>
        )}
        <span className={`material-symbols-outlined ${compact ? 'text-sm' : 'text-base'} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 max-h-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索模型..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* 模型列表 */}
          <div className="overflow-y-auto max-h-[320px]">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                未找到匹配的模型
              </div>
            ) : (
              Object.entries(groupedModels).map(([provider, providerModels]) => {
                const config = getProviderConfig(provider);
                return (
                  <div key={provider}>
                    {/* 提供商分组标题 */}
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 sticky top-0 flex items-center gap-2">
                      <span>{config.icon}</span>
                      {config.label}
                      <span className="ml-auto text-gray-400">{providerModels.length}</span>
                    </div>
                    
                    {/* 模型列表 */}
                    {providerModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                          model.id === currentModelId ? 'bg-primary/10' : ''
                        }`}
                      >
                        {/* 选中指示器 */}
                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          model.id === currentModelId
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {model.id === currentModelId && (
                            <span className="material-symbols-outlined text-white text-xs flex items-center justify-center w-full h-full">
                              check
                            </span>
                          )}
                        </div>
                        
                        {/* 模型信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {model.name}
                            </span>
                            {model.isDefault && (
                              <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                默认
                              </span>
                            )}
                            {model.isCustom && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                                自定义
                              </span>
                            )}
                          </div>
                          
                          {/* 模型 ID */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {model.modelId}
                          </div>
                          
                          {/* 模型属性 */}
                          <div className="flex items-center gap-2 mt-1">
                            {model.speed && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <span className="material-symbols-outlined text-xs">speed</span>
                                {model.speed}
                              </span>
                            )}
                            {model.context && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <span className="material-symbols-outlined text-xs">token</span>
                                {model.context}
                              </span>
                            )}
                            {model.cost && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <span className="material-symbols-outlined text-xs">payments</span>
                                {model.cost}
                              </span>
                            )}
                            {model.supportsText && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400" title="支持文本处理">
                                <span className="material-symbols-outlined text-xs">chat_bubble</span>
                                文本
                              </span>
                            )}
                            {model.supportsImage && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400" title="支持图像处理">
                                <span className="material-symbols-outlined text-xs">image</span>
                                图像
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* 底部操作 */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={() => {
                setIsOpen(false);
                // 可以触发添加自定义模型的回调
              }}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              添加自定义模型
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
