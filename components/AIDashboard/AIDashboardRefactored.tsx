/**
 * AIDashboardRefactored - 重构版 AI 仪表盘组件
 * 
 * 使用模块化的 hooks 和组件，大幅减少代码量
 * 保持与原版相同的功能
 */

import React, { useState, useCallback, useEffect } from 'react';

// 导入模块化组件
import {
  MessageInput,
  MessageList,
  ConversationList,
  ModelSelector,
  AssistantSelector,
  ChatHeader,
  ChatEmptyState,
  SettingsPanel,
  ShortcutsPanel,
  useKeyboardShortcuts,
} from './index';

// 导入 hooks
import { useConversations } from './hooks/useConversations';
import { useModels } from './hooks/useModels';
import { useChat } from './hooks/useChat';

// 导入类型和工具
import {
  AIModel,
  AIAssistant,
  AIConversation,
  DashboardTab,
  ViewMode,
  BubbleTheme,
} from './types';
import {
  exportConversation,
  downloadFile,
} from './utils';

// 外部依赖
import { ModelForm } from '../ModelForm';
import { AssistantForm } from '../AssistantForm';

/**
 * 重构版 AI 仪表盘
 */
export const AIDashboardRefactored: React.FC = () => {
  // ==================== Tab 和视图状态 ====================
  const [activeTab, setActiveTab] = useState<DashboardTab>('Chat');
  const [modelViewMode, setModelViewMode] = useState<ViewMode>('grid');
  const [assistantViewMode, setAssistantViewMode] = useState<ViewMode>('grid');
  
  // ==================== UI 状态 ====================
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [showAssistantForm, setShowAssistantForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AIAssistant | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // ==================== 输入状态 ====================
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // ==================== 设置状态 ====================
  const [chatSettings, setChatSettings] = useState({
    temperature: 0.7,
    maxTokens: 512,
    streamEnabled: true,
    bubbleTheme: 'default' as BubbleTheme,
    toneStyle: 'default' as const,
    codeTheme: 'github' as const,
    showTimestamps: true,
    showAvatars: true,
    autoSave: true,
    soundEnabled: false,
    markdownEnabled: true,
  });

  // ==================== 使用 Hooks ====================
  const conversationsHook = useConversations();
  const modelsHook = useModels();
  const chatHook = useChat();

  // 解构常用属性
  const { 
    conversations, 
    currentConversationId, 
    filteredConversations,
    setCurrentConversationId,
    deleteConversation,
    archiveConversation,
    toggleStarConversation,
    addTagToConversation,
    removeTagFromConversation,
    setSearchQuery,
    setSortBy,
    searchQuery,
    sortBy,
  } = conversationsHook;

  const {
    models,
    assistants,
    currentModelId,
    currentAssistantId,
    currentModel,
    currentAssistant,
    selectModel,
    selectAssistant,
    createModel,
    updateModel: updateModelApi,
    deleteModel: deleteModelApi,
    createAssistant,
    updateAssistant: updateAssistantApi,
    deleteAssistant: deleteAssistantApi,
  } = modelsHook;

  const {
    messages,
    isLoading,
    streaming,
    bookmarkedMessages,
    selectedMessages,
    setMessages,
    sendMessage,
    deleteMessage,
    editMessage,
    regenerateMessage,
    toggleBookmark,
    toggleSelection,
    clearSelection,
  } = chatHook;

  // ==================== 计算属性 ====================
  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;

  // ==================== 回调函数 ====================
  
  // 创建新对话
  const handleNewChat = useCallback(() => {
    // 清空当前对话
    setCurrentConversationId(null);
    setMessages([]);
    setInputText('');
  }, [setCurrentConversationId, setMessages]);

  // 选择助手（同时自动切换到助手对应的模型）
  const handleSelectAssistant = useCallback((assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    if (assistant && assistant.model) {
      // 如果助手有配置的模型，自动切换
      selectModel(assistant.model);
    }
    selectAssistant(assistantId);
  }, [assistants, selectModel, selectAssistant]);

  // 确保助手关联的模型被选中
  useEffect(() => {
    if (currentAssistant && currentAssistant.model && currentModelId !== currentAssistant.model) {
      selectModel(currentAssistant.model);
    }
  }, [currentAssistant?.id, currentAssistant?.model, selectModel]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    
    await sendMessage({
      text: inputText,
      modelId: currentModelId || undefined,
      assistantId: currentAssistantId || undefined,
      files: attachments, // 传递文件列表供上传
    });
    
    setInputText('');
    setAttachments([]);
  }, [inputText, attachments, currentModelId, currentAssistantId, sendMessage]);

  // 导出对话
  const handleExport = useCallback((format: 'markdown' | 'html' | 'json') => {
    if (!currentConversation) return;
    
    const content = exportConversation(currentConversation as unknown as AIConversation, format);
    const ext = format === 'markdown' ? 'md' : format;
    const mimeType = format === 'json' 
      ? 'application/json' 
      : format === 'html' 
        ? 'text/html' 
        : 'text/markdown';
    
    downloadFile(content, `${currentConversation.title}.${ext}`, mimeType);
  }, [currentConversation]);

  // 更新设置
  const handleSettingsChange = useCallback((newSettings: Partial<typeof chatSettings>) => {
    setChatSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // 处理模型操作
  const handleEditModel = useCallback((model: AIModel) => {
    setEditingModel(model);
    setShowModelForm(true);
  }, []);

  const handleDeleteModel = useCallback(async (modelId: string) => {
    if (confirm('确定要删除这个模型吗？')) {
      await deleteModelApi(modelId);
    }
  }, [deleteModelApi]);

  // 处理助手操作
  const handleEditAssistant = useCallback((assistant: AIAssistant) => {
    setEditingAssistant(assistant);
    setShowAssistantForm(true);
  }, []);

  const handleDeleteAssistant = useCallback(async (assistantId: string) => {
    if (confirm('确定要删除这个助手吗？')) {
      await deleteAssistantApi(assistantId);
    }
  }, [deleteAssistantApi]);

  // 处理附件
  const handleAddAttachment = useCallback((file: File) => {
    setAttachments(prev => [...prev, file]);
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== 键盘快捷键 ====================
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: handleNewChat },
    { key: '/', ctrl: true, action: () => setShowShortcuts(true) },
    { key: ',', ctrl: true, action: () => setShowSettings(true) },
    { key: 'b', ctrl: true, action: () => setSidebarCollapsed(prev => !prev) },
    { key: 'Escape', action: () => {
      setShowSettings(false);
      setShowShortcuts(false);
    }},
  ]);

  // ==================== 转换数据格式 ====================
  const bookmarkedIndices = Array.from(bookmarkedMessages);
  const selectedIndices = Array.from(selectedMessages);

  // ==================== 渲染 ====================
  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
        <div className="h-full flex flex-col">
          {/* 侧边栏头部 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              新对话
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(['Chat', 'Models', 'Assistants'] as DashboardTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {tab === 'Chat' ? '对话' : tab === 'Models' ? '模型' : '助手'}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'Chat' && (
              <ConversationList
                conversations={filteredConversations as AIConversation[]}
                currentConversationId={currentConversationId}
                onSelectConversation={setCurrentConversationId}
                onDeleteConversation={deleteConversation}
                onNewConversation={handleNewChat}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortMode={sortBy}
                onSortChange={setSortBy}
              />
            )}

            {activeTab === 'Models' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">AI 模型</h3>
                  <button
                    onClick={() => {
                      setEditingModel(null);
                      setShowModelForm(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
                <ModelSelector
                  models={models}
                  currentModelId={currentModelId}
                  onSelectModel={selectModel}
                />
              </div>
            )}

            {activeTab === 'Assistants' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">AI 助手</h3>
                  <button
                    onClick={() => {
                      setEditingAssistant(null);
                      setShowAssistantForm(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
                <AssistantSelector
                  assistants={assistants}
                  currentAssistantId={currentAssistantId}
                  onSelectAssistant={handleSelectAssistant}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 聊天头部 */}
        <ChatHeader
          conversation={currentConversation as unknown as AIConversation}
          currentModel={currentModel}
          currentAssistant={currentAssistant}
          onNewChat={handleNewChat}
          onExport={handleExport}
          onSettings={() => setShowSettings(true)}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          showSidebar={!sidebarCollapsed}
        />

        {/* 消息列表 */}
        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <ChatEmptyState 
              action={{
                label: '开始新对话',
                onClick: handleNewChat,
                icon: 'add'
              }}
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={streaming.isStreaming}
            streamingText={streaming.currentText}
            theme={chatSettings.bubbleTheme}
            showTimestamps={chatSettings.showTimestamps}
            showAvatars={chatSettings.showAvatars}
            bookmarkedIndices={bookmarkedIndices}
            selectedIndices={selectedIndices}
            onBookmark={toggleBookmark}
            onSelect={toggleSelection}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onRegenerate={regenerateMessage}
            assistantName={currentAssistant?.name}
            assistantAvatar={currentAssistant?.avatar}
          />
        )}

        {/* 输入区域 */}
        <MessageInput
          value={inputText}
          onChange={setInputText}
          onSend={async (text) => {
            await handleSendMessage();
          }}
          onStop={chatHook.stopStreaming}
          isLoading={isLoading}
          placeholder={`发送消息给 ${currentAssistant?.name || 'AI'}...`}
        />
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <SettingsPanel
            settings={chatSettings}
            onSettingsChange={handleSettingsChange}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* 快捷键帮助 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ShortcutsPanel onClose={() => setShowShortcuts(false)} />
        </div>
      )}

      {/* 模型表单 */}
      {showModelForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <ModelForm
              model={editingModel}
              onSave={async (data) => {
                if (editingModel) {
                  await updateModelApi(editingModel.id, data);
                } else {
                  await createModel(data);
                }
                setShowModelForm(false);
              }}
              onClose={() => setShowModelForm(false)}
            />
          </div>
        </div>
      )}

      {/* 助手表单 */}
      {showAssistantForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <AssistantForm
              assistant={editingAssistant}
              onSave={async (data) => {
                if (editingAssistant) {
                  await updateAssistantApi(editingAssistant.id, data);
                } else {
                  await createAssistant(data);
                }
                setShowAssistantForm(false);
              }}
              onClose={() => setShowAssistantForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDashboardRefactored;
