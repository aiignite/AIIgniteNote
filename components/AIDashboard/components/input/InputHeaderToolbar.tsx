import React from 'react';
import { ModelQuickSwitcher } from './ModelQuickSwitcher';
import { SavedTemplatesMenu } from './SavedTemplatesMenu';
import { ExportMenu } from './ExportMenu';
import { ToneSelector } from './ToneSelector';

interface AIModel {
  id: string;
  provider: string;
  modelId: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface SavedTemplate {
  id: string;
  name: string;
  prompt: string;
}

interface InputHeaderToolbarProps {
  // 模型相关
  currentModelLabel: string;
  currentModelId?: string;
  models: AIModel[];
  frequentModels: AIModel[];
  modelUsageHistory: Record<string, number>;
  onSelectModel: (model: AIModel) => void;
  onViewAllModels: () => void;
  // 助手相关
  currentAssistantLabel: string;
  onSwitchAssistant: () => void;
  // 模板相关
  savedTemplates: SavedTemplate[];
  onUseTemplate: (prompt: string) => void;
  onDeleteTemplate: (id: string) => void;
  // 导出相关
  hasMessages: boolean;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onExport: (format: string) => void;
  onClearConversation: () => void;
  // 语气风格相关
  selectedTone: string;
  showToneMenu: boolean;
  onToggleToneMenu: () => void;
  onSelectTone: (tone: string) => void;
  // 快捷键帮助
  onShowKeyboardHelp: () => void;
}

/**
 * 输入区顶部工具栏组件
 * 包含模型切换、导出、语气选择等功能
 */
export const InputHeaderToolbar: React.FC<InputHeaderToolbarProps> = ({
  currentModelLabel,
  currentModelId,
  models,
  frequentModels,
  modelUsageHistory,
  onSelectModel,
  onViewAllModels,
  currentAssistantLabel,
  onSwitchAssistant,
  savedTemplates,
  onUseTemplate,
  onDeleteTemplate,
  hasMessages,
  showExportMenu,
  onToggleExportMenu,
  onExport,
  onClearConversation,
  selectedTone,
  showToneMenu,
  onToggleToneMenu,
  onSelectTone,
  onShowKeyboardHelp
}) => {
  return (
    <div className="flex items-center justify-between mb-1 px-1">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {/* 模型快速切换下拉菜单 */}
        <ModelQuickSwitcher
          currentModelLabel={currentModelLabel}
          currentModelId={currentModelId}
          models={models}
          frequentModels={frequentModels}
          modelUsageHistory={modelUsageHistory}
          onSelectModel={onSelectModel}
          onViewAllModels={onViewAllModels}
        />
        <span>•</span>
        <span className="material-symbols-outlined text-sm">auto_awesome</span>
        <span>{currentAssistantLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        {/* 我的模板 */}
        <SavedTemplatesMenu
          templates={savedTemplates}
          onUseTemplate={onUseTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
        {/* 导出对话 */}
        {hasMessages && (
          <>
            <ExportMenu
              showMenu={showExportMenu}
              hasMessages={hasMessages}
              onToggleMenu={onToggleExportMenu}
              onExport={onExport}
            />
            <button
              onClick={onClearConversation}
              className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs transition-all"
              title="清空对话"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              <span className="hidden sm:inline">清空</span>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
          </>
        )}
        <button
          onClick={onSwitchAssistant}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs hover:border-primary/50 transition-all"
          title="切换助手"
        >
          <span className="material-symbols-outlined text-sm">swap_horiz</span>
          切换助手
        </button>
        {/* 语气风格选择 */}
        <ToneSelector
          selectedTone={selectedTone}
          showMenu={showToneMenu}
          onToggleMenu={onToggleToneMenu}
          onSelectTone={onSelectTone}
        />
        <button
          onClick={onShowKeyboardHelp}
          className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs transition-all"
          title="快捷键帮助 (⌘/)"
        >
          <span className="material-symbols-outlined text-sm">keyboard</span>
        </button>
      </div>
    </div>
  );
};
