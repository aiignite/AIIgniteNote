import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';
import { ModelForm } from './ModelForm';
import { AssistantForm } from './AssistantForm';
import { AIChatMessage } from './AIChatMessage';
import { 
  processFileForAI, 
  ProcessedFile, 
  buildMessageWithAttachments,
  formatFileSize,
  getFileIcon 
} from '../services/fileProcessor';

// 导入模态框组件
import {
  SummaryModal,
  ContextPreviewModal,
  ShortcutsModal,
  MergeModal,
  ImportModal,
  MessageStatsModal,
  ContinuationPanel,
  CompareModal,
  GroupModal,
  SaveTemplateModal,
  KeyboardHelpModal,
  AnalyticsModal,
  CostEstimateModal,
  SnapshotsPanel,
  MemorySummaryModal,
  ModelInfoModal,
  ActivityHeatmapModal,
  AssistantSwitcherModal,
  ShortcutsHelpModal,
  TemplatePickerModal,
} from './AIDashboard/components/modals';

// 导入标签页组件
import { ModelsTab, AssistantsTab } from './AIDashboard/components/tabs';

// 导入侧边栏组件
import { ConversationSidebar } from './AIDashboard/components/sidebar';

// 导入头部组件
import { DashboardHeader } from './AIDashboard/components/DashboardHeader';

// 导入聊天组件
import { ChatStatsBar, ChatEmptyStates, MessageTimeline, MultiSelectToolbar, MessageActions } from './AIDashboard/components/chat';
// 导入输入区域组件
import { 
  UrlDetector, 
  TitleSuggestion, 
  FollowUpSuggestions,
  ResponseTimeoutAlert,
  ConversationStatsPanel,
  SlashCommandPanel,
  SmartTagSuggestions,
  PriorityRating,
  QuickPhrasesPanel,
  AttachmentPreview,
  KeyboardShortcutsHint,
  ReplyQuotePreview,
  SmartSuggestionsPanel,
  InputStatsDisplay,
  PromptOptimizationTip,
  InputToolbar,
  QuickRepliesManager,
  InputHeaderToolbar
} from './AIDashboard/components/input';

// 导入新的类型定义和钩子 (用于未来增量重构)
// 类型使用别名避免与现有内部类型冲突
import type { 
  AIModel as ExternalAIModel, 
  AIAssistant as ExternalAIAssistant, 
  AIConversation as ExternalAIConversation 
} from './AIDashboard/types';
// 钩子将在渐进式重构中逐步启用
// import { useConversations, useModels, useChat } from './AIDashboard/hooks';

// 内部 AI Model 类型定义 (兼容现有代码)
interface InternalAIModel {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  popularity: number;
  isPublic: boolean;
  isCustom: boolean;
  speed: string;
  cost: string;
  context: string;
  description: string;
}

// AI Assistant 类型定义
interface AIAssistant {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar: string;
  systemPrompt: string;
  category: string;
  isSystem: boolean;
  isCustom?: boolean;
  isDefault?: boolean; // 是否为默认助手
  usageCount: number;
  model?: string;  // Model ID to use for this assistant
}

// 支持视觉功能的模型模式列表
const VISION_MODEL_PATTERNS = [
  'gpt-4-vision', 'gpt-4o', 'gpt-4-turbo', 'gpt-4.1', 'gpt-4.5', 'o1', 'o3',
  'gemini-pro-vision', 'gemini-1.5', 'gemini-2', 'gemini-exp',
  'claude-3', 'claude-3.5', 'claude-4',
  'qwen-vl', 'qwen2-vl', 'qwen2.5-vl', 'qwen-max-vl', 'qwen-plus-vl',
  'llava', 'bakllava', 'cogvlm', 'internvl', 'moondream', 'minicpm-v', 'yi-vl', 'deepseek-vl',
  'vision', '-vl'
];

// 检查模型是否支持视觉功能
function isVisionCapableModel(
  modelId: string | undefined,
  models?: Array<{ modelId?: string; supportsImage?: boolean }>
): boolean {
  if (!modelId) return false;
  if (models && models.length > 0) {
    const matched = models.find((m) => m.modelId === modelId);
    if (matched && typeof matched.supportsImage === 'boolean') {
      return matched.supportsImage;
    }
  }
  const lower = modelId.toLowerCase();
  return VISION_MODEL_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Models' | 'Assistants' | 'Chat'>('Chat');
  const [modelViewMode, setModelViewMode] = useState<'grid' | 'list'>('grid');
  const [assistantViewMode, setAssistantViewMode] = useState<'grid' | 'list'>('grid');
  const [inputText, setInputText] = useState('');
  const [models, setModels] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // 表单状态
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [showAssistantForm, setShowAssistantForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<any>(null);

  // Chat 功能状态
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationMeta, setCurrentConversationMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // 用于历史对话列表搜索
  const [chatSearchQuery, setChatSearchQuery] = useState(''); // 用于当前聊天内容搜索
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false); // 只显示书签消息
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; text: string } | null>(null); // 引用回复
  const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; prompt: string; createdAt: Date }>>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [conversationTags, setConversationTags] = useState<Record<string, string[]>>({}); // 对话ID -> 标签数组
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // 当前筛选的标签
  const [showTagManager, setShowTagManager] = useState(false); // 显示标签管理弹窗
  const [editingConversationTags, setEditingConversationTags] = useState<string | null>(null); // 正在编辑标签的对话ID
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]); // 检测到的URL列表
  const [fetchingUrl, setFetchingUrl] = useState<string | null>(null); // 正在抓取的URL
  const [showPinnedMessages, setShowPinnedMessages] = useState(false); // 显示置顶消息导航
  const [showExportMenu, setShowExportMenu] = useState(false); // 显示导出格式菜单
  const [selectedTone, setSelectedTone] = useState<string>('default'); // AI回复语气风格
  const [showToneMenu, setShowToneMenu] = useState(false); // 显示语气选择菜单
  const [modelUsageHistory, setModelUsageHistory] = useState<Record<string, number>>({}); // 模型使用次数统计
  const [suggestedTags, setSuggestedTags] = useState<Record<string, string[]>>({}); // 对话ID -> 建议标签
  const [showTimeline, setShowTimeline] = useState(false); // 显示消息时间线
  const [timelinePosition, setTimelinePosition] = useState(0); // 时间线位置(0-100)
  const [conversationStats, setConversationStats] = useState<{
    regenerateCount: number;
    editCount: number;
    avgResponseTime: number;
    longestStreak: number;
    currentStreak: number;
  }>({ regenerateCount: 0, editCount: 0, avgResponseTime: 0, longestStreak: 0, currentStreak: 0 });
  const [showConversationStats, setShowConversationStats] = useState(false); // 显示对话统计详情
  
  // Phase 14: 新增功能状态
  const [messageVersions, setMessageVersions] = useState<Record<number, string[]>>({}); // 消息索引 -> 历史版本数组
  const [showVersionHistory, setShowVersionHistory] = useState<number | null>(null); // 当前查看历史的消息索引
  const [quickReplies, setQuickReplies] = useState<string[]>(['继续', '详细解释', '给我一个例子', '总结一下', '翻译成中文', '翻译成英文']); // 快捷回复
  const [showQuickReplies, setShowQuickReplies] = useState(false); // 显示快捷回复面板
  const [conversationFolders, setConversationFolders] = useState<Record<string, string>>({}); // 对话ID -> 文件夹名
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // 当前选中的文件夹过滤
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set()); // 多选消息索引集合
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // 是否处于多选模式

  // Phase 15: 新增功能状态
  const [isSpeaking, setIsSpeaking] = useState(false); // 是否正在朗读
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null); // 正在朗读的消息索引
  const [codeTheme, setCodeTheme] = useState<'github' | 'monokai' | 'dracula' | 'nord'>('github'); // 代码块主题
  const [showCodeThemeMenu, setShowCodeThemeMenu] = useState(false); // 显示代码主题菜单
  const [generationSpeed, setGenerationSpeed] = useState<number>(0); // 生成速度 tokens/s
  const [generationStartTime, setGenerationStartTime] = useState<number>(0); // 生成开始时间
  const [generatedTokens, setGeneratedTokens] = useState<number>(0); // 已生成 token 数
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null); // TTS 实例

  // Phase 16: 新增功能状态
  const [searchHighlight, setSearchHighlight] = useState<string>(''); // 搜索高亮关键词
  const [estimatedCost, setEstimatedCost] = useState<number>(0); // 估算成本(美分)
  const [showCostEstimate, setShowCostEstimate] = useState(false); // 显示成本估算
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false); // 显示快捷键帮助

  // Phase 17: 高级交互功能状态
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null); // 拖拽中的消息ID
  const [dragOverMessageId, setDragOverMessageId] = useState<string | null>(null); // 拖拽悬停目标
  const [conversationBranches, setConversationBranches] = useState<{[convId: string]: string[]}>(() => {
    // 从 localStorage 加载分支
    try {
      const saved = localStorage.getItem('aiignite-conversation-branches');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  }); // 对话分支管理
  const [showMergeDialog, setShowMergeDialog] = useState(false); // 显示合并对话框
  const [messagesToMerge, setMessagesToMerge] = useState<string[]>([]); // 待合并消息
  const [conversationSnapshots, setConversationSnapshots] = useState<{
    id: string;
    name: string;
    timestamp: number;
    conversationId: string;
    messages: typeof chatMessages;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('aiignite-conversation-snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }); // 对话快照
  const [showSnapshotsPanel, setShowSnapshotsPanel] = useState(false); // 显示快照面板

  // Phase 18: 智能辅助功能状态
  const [autoDraftSaved, setAutoDraftSaved] = useState(false); // 草稿已保存标记
  const [lastDraftSaveTime, setLastDraftSaveTime] = useState<Date | null>(null); // 上次保存时间
  const [showMemorySummary, setShowMemorySummary] = useState(false); // 显示记忆摘要
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]); // 智能跟进问题
  const [responseTimeout, setResponseTimeout] = useState(false); // 响应超时标记
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null); // 响应开始时间
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 超时定时器

  // Phase 19: 界面美化状态
  const [bubbleTheme, setBubbleTheme] = useState<'default' | 'minimal' | 'gradient' | 'glass'>(() => {
    try {
      return (localStorage.getItem('ai-bubble-theme') as any) || 'default';
    } catch { return 'default'; }
  }); // 消息气泡主题
  const [showModelInfo, setShowModelInfo] = useState(false); // 显示模型信息卡片
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false); // 工具栏折叠状态
  const [messageAnimations, setMessageAnimations] = useState(true); // 消息动效开关

  // Phase 20: 效率优化状态
  const [showActivityHeatmap, setShowActivityHeatmap] = useState(false); // 活跃度热力图
  const [promptOptimizationTip, setPromptOptimizationTip] = useState<string | null>(null); // 提问优化建议
  const [showQuickUploadZone, setShowQuickUploadZone] = useState(false); // 快捷上传区
  const [favoriteAssistants, setFavoriteAssistants] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ai-favorite-assistants');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }); // 收藏的助手
  const [showAssistantSwitcher, setShowAssistantSwitcher] = useState(false); // 显示助手切换器

  // Phase 21: 对话增强状态
  const [showExportOptions, setShowExportOptions] = useState(false); // 显示导出选项
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true); // 自动标题生成开关
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null); // 生成的标题建议
  const [dismissedTitleConversations, setDismissedTitleConversations] = useState<Set<string>>(new Set()); // 已关闭标题建议的对话ID集合

  // Phase 22: 高级搜索与书签
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false); // 显示高级搜索面板
  const [searchDateRange, setSearchDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' }); // 日期范围
  const [searchAssistantFilter, setSearchAssistantFilter] = useState<string>(''); // 助手过滤
  const [messageBookmarks, setMessageBookmarks] = useState<Set<string>>(new Set()); // 消息书签
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false); // 仅显示书签消息
  // showConversationStats 已在上方声明
  const [slashCommandMode, setSlashCommandMode] = useState(false); // 斜杠命令模式
  const [slashCommandFilter, setSlashCommandFilter] = useState(''); // 命令过滤

  // Phase 23: 显示模式与标签建议
  const [compactMessageMode, setCompactMessageMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatCompactMode') === 'true';
    }
    return false;
  }); // 紧凑消息模式
  // suggestedTags 已在上方声明为 Record<string, string[]>
  const [smartTagSuggestions, setSmartTagSuggestions] = useState<string[]>([]); // Phase 23 智能标签建议
  const [conversationPriority, setConversationPriority] = useState<{ [id: string]: number }>({}); // 对话优先级 1-5
  const [focusArea, setFocusArea] = useState<'input' | 'list' | 'messages'>('input'); // 当前焦点区域

  // Phase 24: 时间与分享功能
  const [useRelativeTime, setUseRelativeTime] = useState(true); // 使用相对时间
  const [showShareMenu, setShowShareMenu] = useState(false); // 显示分享菜单
  const [shareableLink, setShareableLink] = useState<string | null>(null); // 可分享链接

  // Phase 25: 归档与模板
  const [archivedConversations, setArchivedConversations] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatArchivedConversations');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }); // 已归档的对话 ID
  const [showArchived, setShowArchived] = useState(false); // 显示归档对话
  const [phase25Templates] = useState<Array<{
    id: string;
    name: string;
    systemPrompt: string;
    firstMessage?: string;
    icon: string;
  }>>([
    { id: 'p25_t1', name: '代码审查', systemPrompt: '你是一个专业的代码审查专家', firstMessage: '请帮我审查以下代码:', icon: '🔍' },
    { id: 'p25_t2', name: '翻译助手', systemPrompt: '你是一个专业的翻译助手，精通中英双语', firstMessage: '请翻译以下内容:', icon: '🌐' },
    { id: 'p25_t3', name: '写作润色', systemPrompt: '你是一个专业的文字编辑，帮助用户润色文章', firstMessage: '请帮我润色以下文字:', icon: '✍️' },
    { id: 'p25_t4', name: '头脑风暴', systemPrompt: '你是一个创意顾问，帮助用户进行头脑风暴', firstMessage: '让我们一起头脑风暴:', icon: '💡' }
  ]); // Phase 25 对话模板
  // showTemplateModal 已在上方声明
  const [conversationReminders, setConversationReminders] = useState<{ [convId: string]: Date }>({}); // 对话提醒时间

  // Phase 26: 消息反馈、快捷短语、对话排序、键盘导航
  const [messageFeedback, setMessageFeedback] = useState<{ [msgIndex: number]: 'like' | 'dislike' | null }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessageFeedback');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  }); // 消息反馈 (点赞/踩)
  const [quickPhrases] = useState<Array<{ id: string; text: string; icon: string }>>([
    { id: 'qp1', text: '请详细解释一下', icon: '📖' },
    { id: 'qp2', text: '给我一个例子', icon: '💡' },
    { id: 'qp3', text: '用更简单的语言解释', icon: '🎯' },
    { id: 'qp4', text: '有什么替代方案？', icon: '🔄' },
    { id: 'qp5', text: '总结一下要点', icon: '📝' },
    { id: 'qp6', text: '这段代码有什么问题？', icon: '🐛' }
  ]); // 快捷短语
  const [showQuickPhrases, setShowQuickPhrases] = useState(false); // 显示快捷短语面板
  const [conversationSortMode, setConversationSortMode] = useState<'time' | 'name' | 'messages' | 'priority'>('time'); // 对话排序模式
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number | null>(null); // 键盘导航聚焦的消息索引

  // Phase 27: 消息搜索高亮、输入历史、消息统计、智能建议
  const [messageSearchQuery, setMessageSearchQuery] = useState(''); // 消息内容搜索
  const [showMessageSearch, setShowMessageSearch] = useState(false); // 显示消息搜索栏
  const [inputHistory, setInputHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatInputHistory');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }); // 输入历史
  const [historyIndex, setHistoryIndex] = useState(-1); // 历史浏览索引
  const [showInputStats, setShowInputStats] = useState(false); // 显示输入统计
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]); // 智能输入建议

  // Phase 28: 消息折叠、AI角色切换
  // showExportOptions 已在上方声明
  const [collapsedMessages, setCollapsedMessages] = useState<Set<number>>(new Set()); // 折叠的消息索引
  const [aiPersona, setAiPersona] = useState<'default' | 'creative' | 'precise' | 'friendly'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('chatAiPersona') as any) || 'default';
    }
    return 'default';
  }); // AI 角色风格
  const [showPersonaMenu, setShowPersonaMenu] = useState(false); // 显示角色菜单
  const [quickActions] = useState<Array<{ id: string; label: string; icon: string; action: () => void }>>([]);

  // Phase 29: 对话摘要、消息时间线、代码复制增强、上下文预览
  const [conversationSummary, setConversationSummary] = useState<string>(''); // 对话摘要
  const [showSummary, setShowSummary] = useState(false); // 显示摘要面板
  const [timelineView, setTimelineView] = useState(false); // 时间线视图模式
  const [codeBlocksCopied, setCodeBlocksCopied] = useState<Set<string>>(new Set()); // 已复制的代码块
  const [showContextPreview, setShowContextPreview] = useState(false); // 显示上下文预览

  // Phase 30: 会话合并、消息搜索跳转、响应格式选择、快捷键面板
  const [showMergeModal, setShowMergeModal] = useState(false); // 显示合并对话弹窗
  const [mergeTarget, setMergeTarget] = useState<string | null>(null); // 合并目标对话ID
  const [searchJumpIndex, setSearchJumpIndex] = useState<number | null>(null); // 搜索结果跳转索引
  const [responseFormat, setResponseFormat] = useState<'auto' | 'concise' | 'detailed' | 'code'>('auto'); // 响应格式偏好
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false); // 显示快捷键面板

  // Phase 31: 消息反应、对话导入、智能分段、消息翻译
  const [messageReactions, setMessageReactions] = useState<Record<number, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessageReactions');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  }); // 消息反应表情
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null); // 显示反应选择器的消息索引
  const [showImportModal, setShowImportModal] = useState(false); // 显示导入对话弹窗
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({}); // 翻译后的消息
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null); // 正在翻译的消息索引
  const [autoSegment, setAutoSegment] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatAutoSegment') === 'true';
    }
    return false;
  }); // 智能分段开关

  // Phase 32: 消息比对、对话克隆、智能续写、消息统计面板
  const [showCompareModal, setShowCompareModal] = useState(false); // 显示消息比对弹窗
  const [compareMessages, setCompareMessages] = useState<[number, number] | null>(null); // 比对的两条消息索引
  const [showMessageStats, setShowMessageStats] = useState(false); // 显示消息统计面板
  const [continuationSuggestions, setContinuationSuggestions] = useState<string[]>([]); // 续写建议
  const [showContinuationPanel, setShowContinuationPanel] = useState(false); // 显示续写面板

  // Phase 33: 消息分组、对话重命名快捷、智能摘要、快捷操作菜单
  const [messageGroups, setMessageGroups] = useState<Record<string, number[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatMessageGroups');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  }); // 消息分组（主题分组）
  const [showGroupModal, setShowGroupModal] = useState(false); // 显示分组弹窗
  const [quickRenameId, setQuickRenameId] = useState<string | null>(null); // 快速重命名的对话ID
  const [quickRenameValue, setQuickRenameValue] = useState(''); // 快速重命名输入值
  const [showQuickActions, setShowQuickActions] = useState(false); // 显示快捷操作菜单
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatAutoSummary') === 'true';
    }
    return false;
  }); // 自动摘要开关

  // Phase 34: 消息高亮、对话星标、输入模板、消息引用链
  const [userHighlightedMsgs, setUserHighlightedMsgs] = useState<Set<number>>(new Set()); // 用户手动高亮的消息
  const [starredConversations, setStarredConversations] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatStarredConversations');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  }); // 星标对话
  const [inputTemplates, setInputTemplates] = useState<Array<{ id: string; name: string; content: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatInputTemplates');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: '代码审查', content: '请帮我审查以下代码，指出潜在问题和优化建议：\n\n```\n\n```' },
        { id: '2', name: '文章润色', content: '请帮我润色以下文章，改进表达和结构：\n\n' },
        { id: '3', name: '翻译请求', content: '请将以下内容翻译成英文：\n\n' },
        { id: '4', name: '问题分析', content: '我遇到了以下问题，请帮我分析可能的原因和解决方案：\n\n问题描述：' }
      ];
    }
    return [];
  }); // 输入模板
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false); // 显示模板面板
  const [messageReferenceChain, setMessageReferenceChain] = useState<number[]>([]); // 消息引用链

  // Refs for stream control and scroll
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const stopSignalRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // 检测语音识别支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / 显示快捷键帮助
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }
      // Cmd/Ctrl + K 聚焦输入框
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      // Cmd/Ctrl + Shift + F 搜索对话
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowChatSearch(true);
      }
      // Escape 关闭弹窗
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowTemplateModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCustomModelsAndAssistants = async () => {
    try {
      console.log('[Load] Loading models and assistants from database...');

      // Load models from database only
      const modelsResponse = await api.getAIModels() as any;
      if (modelsResponse.success && modelsResponse.data) {
        const dbModels = modelsResponse.data;
        console.log('[Load] Loaded models from database:', dbModels);

        // Cache to IndexedDB using clear-and-replace to ensure deleted items are removed
        await indexedDB.clearAndCacheModels(dbModels);
        console.log('[Load] Models synced to IndexedDB:', dbModels.length);

        // All models come from database - mark them all as custom/deletable
        const mappedModels = dbModels.map((m: any) => ({
          id: m.id,
          name: m.name,
          modelId: m.modelId,
          provider: m.provider,
          endpoint: m.endpoint,
          desc: m.description || `${m.provider} model`,
          description: m.description || '',
          speed: m.speed || 'Fast',
          cost: m.cost || '$',
          context: m.context || 'N/A',
          isCustom: true,  // All database models are deletable
          popularity: m.popularity,
          defaultTemplateId: m.defaultTemplateId,
          supportsImage: m.supportsImage ?? false,
          supportsText: m.supportsText ?? true,
        }));
        console.log('[Load] Mapped models:', mappedModels);
        setModels(mappedModels);
        console.log('[Load] Models loaded:', dbModels.length);
      }

      // Load assistants from database only
      const assistantsResponse = await api.getAIAssistants() as any;
      let firstAssistant: AIAssistant | null = null;
      if (assistantsResponse.success && assistantsResponse.data) {
        const { system, custom } = assistantsResponse.data;
        const allAssistants = [...(system || []), ...(custom || [])];
        
        // Cache to IndexedDB
        await indexedDB.clearAndCacheAssistants(allAssistants);
        console.log('[Load] Assistants synced to IndexedDB:', allAssistants.length);
        
        // All assistants come from database - mark custom ones as deletable
        const mappedAssistants = allAssistants.map((a: any) => ({
          ...a,
          isCustom: !a.isSystem,  // Only non-system assistants are deletable
        }));
        setAssistants(mappedAssistants);
        if (mappedAssistants.length > 0) {
          const defaultAssistant = mappedAssistants.find((a: any) => a.isDefault);
          firstAssistant = defaultAssistant || mappedAssistants[0];
          setCurrentAssistant(firstAssistant);
        }
        console.log('[Load] Assistants loaded:', allAssistants.length);
      }
      setLoadingProviders(false);
      return firstAssistant;
    } catch (error) {
      console.error('[Load] Error loading data:', error);
      
      // Fallback to IndexedDB cache
      try {
        const cachedModels = await indexedDB.getAIModels();
        if (cachedModels.length > 0) {
          setModels(cachedModels.map((m: any) => ({
            ...m,
            isCustom: true,
          })));
          console.log('[Load] Loaded models from IndexedDB cache:', cachedModels.length);
        }
        
        const cachedAssistants = await indexedDB.getAIAssistants();
        if (cachedAssistants.length > 0) {
          const mappedAssistants = cachedAssistants.map((a: any) => ({
            ...a,
            isCustom: !a.isSystem,
          }));
          setAssistants(mappedAssistants);
          const defaultAssistant = mappedAssistants.find((a: any) => a.isDefault);
          const firstAssistant = defaultAssistant || mappedAssistants[0];
          setCurrentAssistant(firstAssistant);
          setLoadingProviders(false);
          return firstAssistant;
        }
      } catch (cacheError) {
        console.error('[Load] Failed to load from IndexedDB cache:', cacheError);
      }
      setLoadingProviders(false);
      return null;
    }
  };

  const saveCustomModelsAndAssistants = async (modelsToSave?: any[], assistantsToSave?: AIAssistant[]) => {
    try {
      const modelsList = modelsToSave || models;
      
      // Save models to database
      const customModels = modelsList.filter(m => m.isCustom);
      console.log('Saving custom models to database:', customModels.length, customModels);

      for (const model of customModels) {
        if (model.id && !model.id.startsWith('gemini-') && !model.id.startsWith('gpt-') && !model.id.startsWith('claude-')) {
          try {
            await api.createAIModel({
              name: model.name || model.id,
              modelId: model.modelId || model.id,
              provider: model.provider || 'GEMINI',
              popularity: model.popularity || 50,
              speed: model.speed,
              cost: model.cost,
              context: model.context,
              description: model.desc,
            });
          } catch (error) {
            console.error('Failed to save model to database:', error);
          }
        }
      }
      
      // Note: Assistants are now saved individually via handleSaveAssistant/handleDeleteAssistant
    } catch (error) {
      console.error('Error saving custom data:', error);
    }
  };

  // Initialize with empty array - assistants will be loaded from database
  const [assistants, setAssistants] = useState<AIAssistant[]>([]);
  
  // Default assistant for new chats (used when no assistant is selected)
  const [currentAssistant, setCurrentAssistant] = useState<AIAssistant | null>(null);
  // searchQuery 和 sortBy 用于对话搜索和排序（searchQuery 已在上方定义）
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load available AI data on mount
  useEffect(() => {
    const loadAllData = async () => {
      // 先加载自定义模型（需要等待完成）
      const firstAssistant = await loadCustomModelsAndAssistants();
      await loadAISettings();
      await loadConversationHistory();
      
      // Initialize with greeting if starting fresh in Chat tab
      // Only create new chat if we don't have any conversations
      if (chatMessages.length === 0 && !currentConversationId) {
        try {
          // Pass the freshly loaded assistant if state isn't updated yet
          await handleNewChat(firstAssistant || undefined);
        } catch (error) {
          console.error('Failed to initialize new chat:', error);
        }
      }
    };

    loadAllData();
  }, []);

  const loadAISettings = async () => {
    try {
      const response = await api.getAISettings() as any;
      if (response.success && response.data) {
        setAiSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      setLoadingConversations(true);
      const response = await api.getAIConversations() as any;
      if (response.success && Array.isArray(response.data)) {
        setConversations(response.data);
        // Cache to IndexedDB using clear-and-replace to ensure deleted items are removed
        await indexedDB.clearAndCacheConversations(response.data);
        console.log('[loadConversationHistory] Conversations synced to IndexedDB:', response.data.length);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to IndexedDB if API fails
      try {
        const cachedConversations = await indexedDB.getConversations();
        if (cachedConversations.length > 0) {
          setConversations(cachedConversations);
          console.log('[loadConversationHistory] Loaded from IndexedDB cache:', cachedConversations.length);
        }
      } catch (cacheError) {
        console.error('Failed to load from IndexedDB:', cacheError);
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  // 当AI助手切换时，同步更新当前对话使用的模型
  useEffect(() => {
    if (currentAssistant?.model) {
      const dbModel = models.find((m: any) => m.modelId === currentAssistant.model);
      if (dbModel) {
        console.log('[AIDashboard] Syncing model from assistant:', currentAssistant.name, '-> model:', dbModel.modelId);
        setCurrentConversationMeta(prev => ({
          ...prev,
          provider: dbModel.provider,
          model: dbModel.modelId
        }));
      } else {
        // 如果模型不在列表中，仍然设置模型ID
        console.log('[AIDashboard] Setting assistant model (not in cached models):', currentAssistant.model);
        setCurrentConversationMeta(prev => ({
          ...prev,
          model: currentAssistant.model
        }));
      }
    }
  }, [currentAssistant, models]);

  // 过滤和排序对话
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // 标签过滤
    if (selectedTag) {
      filtered = filtered.filter(conv => 
        conversationTags[conv.id]?.includes(selectedTag)
      );
    }

    // Phase 14: 文件夹过滤
    if (selectedFolder) {
      filtered = filtered.filter(conv => 
        conversationFolders[conv.id] === selectedFolder
      );
    }

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(conv =>
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 排序
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'updated':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'created':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'name':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          comparison = 0;
      }
      // 根据排序方向调整
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [conversations, searchQuery, sortBy, sortOrder]);

  const currentModelLabel = useMemo(() => {
    const modelId = currentConversationMeta?.model || currentAssistant?.model || aiSettings?.defaultModel;
    console.log('[AIDashboard] Calculating currentModelLabel:', {
      conversationMetaModel: currentConversationMeta?.model,
      assistantModel: currentAssistant?.model,
      defaultModel: aiSettings?.defaultModel,
      selectedModelId: modelId,
      availableModels: models.map((m: any) => ({ id: m.id, modelId: m.modelId, name: m.name }))
    });
    const dbModel = models.find((m: any) => m.modelId === modelId);
    const result = dbModel?.name || modelId || '未选择模型';
    console.log('[AIDashboard] Found model:', dbModel ? { id: dbModel.id, modelId: dbModel.modelId, name: dbModel.name } : null, 'result:', result);
    return result;
  }, [currentConversationMeta?.model, currentAssistant?.model, aiSettings?.defaultModel, models]);

  // 当前选中的模型 ID（用于其他逻辑）
  const selectedModel = useMemo(() => {
    return currentConversationMeta?.model || currentAssistant?.model || aiSettings?.defaultModel;
  }, [currentConversationMeta?.model, currentAssistant?.model, aiSettings?.defaultModel]);

  // 当前选中的对话
  const selectedConversation = useMemo(() => {
    if (!currentConversationId) return null;
    return conversations.find(c => c.id === currentConversationId) || null;
  }, [currentConversationId, conversations]);

  const currentAssistantLabel = currentAssistant?.name || '未选择助手';

  // 模型操作处理器
  const handleSaveModel = async (data: any) => {
    try {
      if (editingModel) {
        // Update existing model in database
        if (editingModel.isCustom) {
          const response = await api.updateAIModel(editingModel.id, {
            ...data,
            supportsImage: data.supportsImage,
            supportsText: data.supportsText,
          }) as any;
          if (response.success && response.data) {
            await indexedDB.cacheAIModel(response.data);
          }
        }
      } else {
        // Create new model in database
        const response = await api.createAIModel({
          name: data.name,
          modelId: data.modelId,
          provider: data.provider,
          popularity: data.popularity || 50,
          speed: data.speed,
          cost: data.cost,
          context: data.context,
          description: data.description,
          defaultTemplateId: data.defaultTemplateId,
          supportsImage: data.supportsImage,
          supportsText: data.supportsText,
        }) as any;
        
        // Cache to IndexedDB
        if (response.success && response.data) {
          await indexedDB.cacheAIModel(response.data);
        }
      }
      setShowModelForm(false);
      setEditingModel(null);
      // Reload models to get updated data including template relations
      loadCustomModelsAndAssistants();
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model. Please try again.');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        // Delete from database if it's a custom model
        const modelToDelete = models.find(m => m.id === modelId);
        console.log('[AIDashboard] Deleting model:', modelId, 'isCustom:', modelToDelete?.isCustom);
        
        if (modelToDelete?.isCustom) {
          const response = await api.deleteAIModel(modelId) as any;
          console.log('[AIDashboard] Delete API response:', response);
          
          if (!response.success) {
            throw new Error(response?.message || 'Failed to delete model from server');
          }
          
          // Remove from IndexedDB cache to ensure sync consistency
          await indexedDB.removeAIModel(modelId);
          console.log('[AIDashboard] Model removed from IndexedDB');
        }
        // Update local state
        const updatedModels = models.filter(m => m.id !== modelId);
        setModels(updatedModels);
        console.log('[AIDashboard] Local state updated, remaining models:', updatedModels.length);
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  // 助手操作处理器
  const handleSaveAssistant = async (data: any) => {
    try {
      if (editingAssistant) {
        const response = await api.updateAIAssistant(editingAssistant.id, data) as any;
        if (response.success && response.data) {
          await indexedDB.cacheAIAssistant(response.data);
        }
      } else {
        const response = await api.createAIAssistant({
          ...data,
          isSystem: false
        }) as any;
        
        if (response.success && response.data) {
          await indexedDB.cacheAIAssistant(response.data);
        }
      }
      setShowAssistantForm(false);
      setEditingAssistant(null);
      
      // Reload to reflect changes and potentially updated isDefault status on other assistants
      loadCustomModelsAndAssistants();
    } catch (error) {
      console.error('Failed to save assistant:', error);
      alert('Failed to save assistant. Please try again.');
    }
  };

  const handleSetDefaultAssistant = async (assistantId: string) => {
    try {
      const response = await api.updateAIAssistant(assistantId, { isDefault: true }) as any;
      if (response.success) {
        // Refresh assistants list
        const assistantsResponse = await api.getAIAssistants() as any;
        if (assistantsResponse.success && assistantsResponse.data) {
          const { system, custom } = assistantsResponse.data;
          const allAssistants = [...(system || []), ...(custom || [])];
          const mappedAssistants = allAssistants.map((a: any) => ({
            ...a,
            isCustom: !a.isSystem,
          }));
          setAssistants(mappedAssistants);
          
          // If we just set a default, it should probably be the current one if none selected
          const newDefault = mappedAssistants.find((a: any) => a.isDefault);
          if (newDefault && !currentAssistant) {
            setCurrentAssistant(newDefault);
          }
        }
      }
    } catch (error) {
      console.error('Failed to set default assistant:', error);
    }
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    if (confirm('Are you sure you want to delete this assistant?')) {
      try {
        const assistantToDelete = assistants.find(a => a.id === assistantId);
        console.log('[AIDashboard] Deleting assistant:', assistantId, 'isCustom:', assistantToDelete?.isCustom);
        
        if (assistantToDelete?.isCustom) {
          const response = await api.deleteAIAssistant(assistantId) as any;
          console.log('[AIDashboard] Delete assistant API response:', response);
          
          if (!response.success) {
            throw new Error(response?.message || 'Failed to delete assistant from server');
          }
          
          await indexedDB.removeAIAssistant(assistantId);
          console.log('[AIDashboard] Assistant removed from IndexedDB');
        }
        
        const updatedAssistants = assistants.filter(a => a.id !== assistantId);
        setAssistants(updatedAssistants);
        console.log('[AIDashboard] Local state updated, remaining assistants:', updatedAssistants.length);
      } catch (error) {
        console.error('Failed to delete assistant:', error);
        alert('Failed to delete assistant. Please try again.');
      }
    }
  };

  const handleSelectAssistant = (assistant: AIAssistant) => {
    setCurrentAssistant(assistant);
    setActiveTab('Chat');
    // If we switch assistant, it's like a new chat with that specific persona
    handleNewChat(assistant);
  };

  const handleNewChat = async (assistant?: AIAssistant) => {
    const targetAssistant = assistant || currentAssistant;
    if (!targetAssistant) {
      alert('No assistant available. Please create or sync an assistant first.');
      return;
    }
    console.log('[AIDashboard] handleNewChat called with assistant:', targetAssistant?.name);
    
    try {
      // Create a new conversation in the backend
      console.log('[AIDashboard] Creating new conversation via API...');
      const response = await api.createAIConversation(targetAssistant.name) as any;
      console.log('[AIDashboard] API response:', response);
      
      if (response.success && response.data) {
        const newConversation = response.data;
        console.log('[AIDashboard] New conversation created:', newConversation.id);
        
        // Cache to IndexedDB
        try {
          await indexedDB.cacheConversation(newConversation);
          console.log('[AIDashboard] Conversation cached to IndexedDB');
        } catch (cacheError) {
          console.warn('Failed to cache new conversation to IndexedDB:', cacheError);
        }
        
        // Add to conversations list at the top
        setConversations(prev => [newConversation, ...prev]);
        
        // Set as current conversation
        setCurrentConversationId(newConversation.id);
        setCurrentConversationMeta({
          provider: newConversation.provider,
          model: newConversation.model,
        });

        if (targetAssistant?.model) {
          const assistantDbModel = models.find((m: any) => m.modelId === targetAssistant.model);
          setCurrentConversationMeta({
            provider: assistantDbModel?.provider ?? newConversation.provider,
            model: targetAssistant.model,
          });
        }
        
        // Initialize with greeting message
        setChatMessages([
          {
            role: 'model',
            text: `Hello! I'm your ${targetAssistant.name}. ${targetAssistant.description} How can I help you today?`,
            suggestions: [
              { icon: 'edit_note', label: 'Help me write a note' },
              { icon: 'lightbulb', label: 'Brainstorm some ideas' },
              { icon: 'summarize', label: 'Summarize my recent work' }
            ]
          }
        ]);
        
        setActiveTab('Chat');
      } else {
        console.error('[AIDashboard] API returned unsuccessful response:', response);
        throw new Error(response?.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('[AIDashboard] Error creating new conversation:', error);
      // Fallback to local-only mode if API fails
      setCurrentConversationId(null);
      setCurrentConversationMeta(null);
      setChatMessages([
        {
          role: 'model',
          text: `Hello! I'm your ${targetAssistant.name}. ${targetAssistant.description} How can I help you today?`,
          suggestions: [
            { icon: 'edit_note', label: 'Help me write a note' },
            { icon: 'lightbulb', label: 'Brainstorm some ideas' },
            { icon: 'summarize', label: 'Summarize my recent work' }
          ]
        }
      ]);
      setActiveTab('Chat');
    }
  };

  const handleSelectConversation = async (conversation: any) => {
    console.log('[AIDashboard] handleSelectConversation called:', {
      conversationId: conversation.id,
      conversationTitle: conversation.title
    });
    try {
      setCurrentConversationId(conversation.id);
      setCurrentConversationMeta({
        provider: conversation.provider,
        model: conversation.model,
      });
      // 重置标题建议状态
      setGeneratedTitle(null);
      
      setActiveTab('Chat');
      console.log('[AIDashboard] Fetching conversation messages...');
      const response = await api.getAIConversation(conversation.id) as any;
      console.log('[AIDashboard] API response:', response);
      if (response.success && response.data) {
        // Map backend messages to ChatMessage interface
        // Backend uses 'assistant', frontend uses 'model' (based on types.ts and current implementation)
        const messages = response.data.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          text: m.content
        }));
        console.log('[AIDashboard] Setting chat messages:', messages);
        setChatMessages(messages);
      } else {
        console.warn('[AIDashboard] No messages data in response');
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  };

  // Chat 操作处理器 - 支持附件
  const handleSendMessage = async () => {
    // 允许只有附件或只有文本的情况
    if ((!inputText.trim() && processedFiles.length === 0) || isGenerating) return;

    // 构建带附件的消息
    const { text: messageWithAttachments, images } = buildMessageWithAttachments(
      inputText.trim(),
      processedFiles
    );
    
    const userMessage = messageWithAttachments || inputText.trim();
    
    // 清空输入和附件
    setInputText('');
    setAttachments([]);
    setProcessedFiles([]);
    setIsGenerating(true);
    stopSignalRef.current = false;

    // 记录开始时间用于计算响应时间
    const startTime = Date.now();
    // Phase 15: 重置生成速度统计
    setGenerationStartTime(startTime);
    setGeneratedTokens(0);
    setGenerationSpeed(0);

    // 创建用户消息（显示原始输入，包含引用内容）
    let displayText = inputText.trim() || (processedFiles.length > 0 ? `[已上传 ${processedFiles.length} 个文件]` : '');
    
    // 如果有引用回复，添加引用前缀
    let actualMessageToSend = userMessage;
    if (replyingToMessage) {
      displayText = `> ${replyingToMessage.text}\n\n${displayText}`;
      actualMessageToSend = `[引用内容: "${replyingToMessage.text}"]\n\n${userMessage}`;
      setReplyingToMessage(null); // 清除引用状态
    }
    
    const now = new Date();
    const newUserMessage: ChatMessage = { role: 'user', text: displayText, timestamp: now };
    const aiPlaceholderMsg: ChatMessage = { role: 'model', text: '', timestamp: now };
    const updatedMessages = [...chatMessages, newUserMessage, aiPlaceholderMsg];
    setChatMessages(updatedMessages);

    // Determine provider and model from current conversation, assistant, or settings
    let provider: any = currentConversationMeta?.provider;
    let model = currentConversationMeta?.model;

    // Search models to find the correct provider for the current model
    if (model) {
      const dbModel = models.find((m: any) => m.modelId === model);
      if (dbModel) {
        provider = dbModel.provider;
        console.log('[AIDashboard] Model found in cache, using provider:', provider);
      }
    }

    if (!model && currentAssistant?.model) {
      const dbModel = models.find((m: any) => m.modelId === currentAssistant.model);
      if (dbModel) {
        provider = dbModel.provider;
        model = dbModel.modelId;
        console.log('[AIDashboard] Using assistant model config:', { provider, model });
      } else {
        model = currentAssistant.model;
        // Even if not in local cache, let the backend try to resolve it
      }
    }

    if (!model && aiSettings?.defaultModel) {
      const dbModel = models.find((m: any) => m.modelId === aiSettings.defaultModel);
      if (dbModel) {
        provider = dbModel.provider;
        model = dbModel.modelId;
      } else {
        model = aiSettings.defaultModel;
      }
    }

    if (!model && models.length > 0) {
      model = models[0].modelId;
      provider = models[0].provider;
    }

    if (model) {
      const dbModel = models.find((m: any) => m.modelId === model);
      if (dbModel) {
        provider = dbModel.provider;
      }
    }

    if (!model || !provider) {
      setIsGenerating(false);
      stopSignalRef.current = false;
      alert('未找到可用的 AI 模型，请先添加模型。');
      return;
    }

    // Build messages for API - exclude the AI placeholder
    // 使用带附件内容的完整消息（如果有引用则包含引用）
    const messagesForApi = updatedMessages.slice(0, -1).map((m, idx) => {
      // 最后一条用户消息使用包含附件内容和引用的完整文本
      if (idx === updatedMessages.length - 2 && m.role === 'user') {
        return { ...m, text: actualMessageToSend };
      }
      return m;
    });

    // 如果有图片附件，添加到请求中
    if (images.length > 0) {
      messagesForApi.unshift({
        role: 'system',
        text: `用户上传了 ${images.length} 张图片，请分析图片内容。`
      } as any);
    }

    // 根据选择的语气风格添加系统提示
    const tonePrompts: Record<string, string> = {
      'default': '',
      'professional': '请以专业、正式的语气回复，使用规范的术语和结构化的表达。',
      'casual': '请用轻松随意的语气回复，像朋友聊天一样自然亲切。',
      'humorous': '请用幽默风趣的语气回复，可以适当加入一些有趣的比喻或玩笑。',
      'concise': '请用简洁明了的语气回复，直接给出答案，避免冗余信息。',
      'detailed': '请用详细全面的语气回复，提供充分的解释和例子。',
      'encouraging': '请用鼓励积极的语气回复，给予正面的支持和建议。',
      'academic': '请用学术严谨的语气回复，注重逻辑性和引用依据。',
    };

    if (selectedTone !== 'default' && tonePrompts[selectedTone]) {
      messagesForApi.unshift({
        role: 'system',
        text: tonePrompts[selectedTone]
      } as any);
    }

    const requestData = {
      provider,
      conversationId: currentConversationId || undefined,
      messages: messagesForApi.map(m => ({
        role: (m.role === 'model' ? 'assistant' : m.role) as any,
        content: m.text
      })),
      images: images.length > 0 ? images : undefined, // 传递图片数据
      options: {
        model
      }
    };

    console.log('[AIDashboard] Sending streaming chat request with', images.length, 'images');

    try {
      // Use streaming API
      let accumulatedText = '';
      let finalConversationId: string | undefined;

      const controller = new AbortController();
      streamAbortControllerRef.current = controller;

      await api.chatAIStream(
        requestData,
        // onChunk callback
        (chunk, _done, conversationId) => {
          accumulatedText += chunk;
          finalConversationId = conversationId;

          // Phase 15: 计算生成速度
          const currentTokens = Math.round(accumulatedText.length * 0.7); // 估算 token 数
          setGeneratedTokens(currentTokens);
          const elapsed = (Date.now() - startTime) / 1000; // 秒
          if (elapsed > 0.5) {
            setGenerationSpeed(Math.round(currentTokens / elapsed));
          }

          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: accumulatedText };
            return newMessages;
          });
        },
        // onComplete callback
        (conversationId) => {
          console.log('[AIDashboard] Stream complete, conversationId:', conversationId);
          
          // 计算响应时间并更新消息
          const responseTime = Date.now() - startTime;
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            const lastMsg = newMessages[lastMsgIndex];
            // 估算 token 数量 (粗略: 中文约1字1token, 英文约4字1token)
            const tokenCount = Math.round(lastMsg.text.length * 0.7);
            newMessages[lastMsgIndex] = { 
              ...lastMsg, 
              responseTime,
              tokenCount
            };
            return newMessages;
          });
          
          // Phase 15: 重置生成速度
          setGenerationSpeed(0);
          
          // Update conversation meta and ID
          if (conversationId) {
            if (!currentConversationId) {
              setCurrentConversationId(conversationId);
            }
            setCurrentConversationMeta({ provider, model });
            // 记录模型 usage
            if (model) {
              recordModelUsage(model);
            }
          }
        },
        // onError callback
        (error) => {
          console.error('[AIDashboard] Stream error:', error);
          const errorMessage = typeof error === 'string'
            ? error
            : error?.error || error?.message || '生成失败，请重试。';
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            newMessages[lastMsgIndex] = {
              ...newMessages[lastMsgIndex],
              text: `发生错误：${errorMessage}`
            };
            return newMessages;
          });
        },
        controller
      );

      // Wait for stream to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (controller.signal.aborted || stopSignalRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Also set a timeout to avoid hanging
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 120000); // 2 minute timeout
      });

      // Update or create conversation
      if (!currentConversationId && finalConversationId) {
        console.log('[AIDashboard] Setting conversation ID after stream:', finalConversationId);
        setCurrentConversationId(finalConversationId);
      }
      setCurrentConversationMeta({ provider, model });
      
      // Reload conversation history in background
      try {
        await loadConversationHistory();
      } catch (error) {
        console.warn('[AIDashboard] Failed to reload conversation history:', error);
      }
    } catch (error) {
      console.error('[AIDashboard] Error sending message:', error);
      const errorMessage = typeof error === 'string'
        ? error
        : (error as any)?.error || (error as any)?.message || '生成失败，请重试。';
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        newMessages[lastMsgIndex] = {
          ...newMessages[lastMsgIndex],
          text: `发生错误：${errorMessage}`
        };
        return newMessages;
      });
    } finally {
      setIsGenerating(false);
      stopSignalRef.current = false;
      streamAbortControllerRef.current = null;
      setAttachments([]);
    }
  };

  const handleStopGeneration = () => {
    stopSignalRef.current = true;
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const readImageAsDataUrl = (file: File, maxSize = 1024, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const mimeType = ['image/jpeg', 'image/webp'].includes(file.type) ? file.type : 'image/png';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  // 处理文件上传 - 支持 PDF、图片、文本等
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    setProcessingFiles(true);

    try {
      const processed = await Promise.all(files.map(processFileForAI));
      setProcessedFiles(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('文件处理失败:', error);
    } finally {
      setProcessingFiles(false);
      // 清空 input 以允许重复上传同一文件
      e.target.value = '';
    }
  }, []);

  // 处理图片上传
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    setProcessingFiles(true);

    try {
      const processed = await Promise.all(files.map(processFileForAI));
      setProcessedFiles(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('图片处理失败:', error);
    } finally {
      setProcessingFiles(false);
      e.target.value = '';
    }
  }, []);

  // 移除附件
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // 监听滚动，控制滚动按钮显示
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 消息变化时自动滚动
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);

  // 复制消息
  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加 toast 提示
  }, []);

  // 重新生成回复
  const handleRegenerateResponse = useCallback(() => {
    // 找到最后一条用户消息，重新发送
    let lastUserMsgIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        lastUserMsgIndex = i;
        break;
      }
    }
    if (lastUserMsgIndex >= 0) {
      const lastUserMsg = chatMessages[lastUserMsgIndex];
      // 移除最后一条 AI 回复
      setChatMessages(prev => prev.slice(0, -1));
      setInputText(lastUserMsg.text);
      // 更新重新生成次数
      setConversationStats(prev => ({
        ...prev,
        regenerateCount: prev.regenerateCount + 1
      }));
    }
  }, [chatMessages]);

  // 拖拽上传处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有在离开最外层容器时才关闭拖拽状态
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setAttachments(prev => [...prev, ...files]);
    setProcessingFiles(true);

    try {
      const processed = await Promise.all(files.map(processFileForAI));
      setProcessedFiles(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('文件处理失败:', error);
    } finally {
      setProcessingFiles(false);
    }
  }, []);

  // 对话统计信息
  const chatStats = useMemo(() => {
    if (chatMessages.length === 0) return null;
    
    const userMessages = chatMessages.filter(m => m.role === 'user');
    const aiMessages = chatMessages.filter(m => m.role === 'model');
    const totalChars = chatMessages.reduce((sum, m) => sum + m.text.length, 0);
    const aiChars = aiMessages.reduce((sum, m) => sum + m.text.length, 0);
    
    // 估算 tokens (粗略: 中文约1字1token, 英文约4字1token)
    const estimatedTokens = Math.round(totalChars * 0.7);
    
    // 上下文窗口估算 (常见模型上下文窗口大小)
    const contextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 16385,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
      'gemini-pro': 32000,
      'gemini-1.5-pro': 1000000,
      'gemini-2.0-flash': 1000000,
      'default': 8192
    };
    
    // 获取当前模型的上下文窗口大小
    const currentModel = currentConversationMeta?.model || 'default';
    const contextWindowSize = Object.entries(contextWindows).find(
      ([key]) => currentModel.toLowerCase().includes(key.toLowerCase())
    )?.[1] || contextWindows.default;
    
    const contextUsagePercent = Math.min(100, (estimatedTokens / contextWindowSize) * 100);
    
    // 计算平均评分
    const ratedMessages = aiMessages.filter(m => m.rating);
    const averageRating = ratedMessages.length > 0 
      ? ratedMessages.reduce((sum, m) => sum + (m.rating || 0), 0) / ratedMessages.length 
      : 0;
    
    // 置顶消息数量
    const pinnedCount = chatMessages.filter(m => m.isPinned).length;
    
    return {
      total: chatMessages.length,
      user: userMessages.length,
      ai: aiMessages.length,
      totalChars,
      aiChars,
      estimatedTokens,
      contextWindowSize,
      contextUsagePercent,
      averageRating,
      ratedCount: ratedMessages.length,
      pinnedCount,
    };
  }, [chatMessages, currentConversationMeta?.model]);

  // 搜索过滤消息（聊天内容搜索 + 书签过滤）
  const filteredMessages = useMemo(() => {
    let messages = chatMessages;
    
    // 书签过滤
    if (showBookmarkedOnly) {
      messages = messages.filter(msg => msg.isBookmarked);
    }
    
    // 搜索过滤
    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();
      messages = messages.filter(msg => 
        msg.text.toLowerCase().includes(query)
      );
    }
    
    return messages;
  }, [chatMessages, chatSearchQuery, showBookmarkedOnly]);

  // 搜索结果高亮匹配数
  const searchMatchCount = useMemo(() => {
    if (!chatSearchQuery.trim()) return 0;
    return filteredMessages.length;
  }, [filteredMessages, chatSearchQuery]);

  // 书签消息数量
  const bookmarkCount = useMemo(() => {
    return chatMessages.filter(msg => msg.isBookmarked).length;
  }, [chatMessages]);

  // 获取置顶消息列表
  const pinnedMessages = useMemo(() => {
    return chatMessages
      .map((msg, idx) => ({ ...msg, originalIndex: idx }))
      .filter(msg => msg.isPinned);
  }, [chatMessages]);

  // 跳转到指定消息
  const scrollToMessage = useCallback((messageIndex: number) => {
    const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-index]');
    if (messageElements) {
      const targetElement = Array.from(messageElements).find(
        el => el.getAttribute('data-message-index') === String(messageIndex)
      );
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 高亮闪烁效果
        targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }
    setShowPinnedMessages(false);
  }, []);

  // 时间线导航 - 根据滑块位置跳转到对应消息
  const handleTimelineNavigation = useCallback((position: number) => {
    if (chatMessages.length === 0) return;
    
    // 计算目标消息索引 (0-100 映射到 0-messages.length)
    const targetIndex = Math.floor((position / 100) * (chatMessages.length - 1));
    const clampedIndex = Math.max(0, Math.min(targetIndex, chatMessages.length - 1));
    
    setTimelinePosition(position);
    scrollToMessage(clampedIndex);
  }, [chatMessages.length, scrollToMessage]);

  // 获取时间线上的消息标记点
  const timelineMarkers = useMemo(() => {
    if (chatMessages.length < 5) return [];
    
    // 每隔一定数量消息显示一个标记
    const interval = Math.max(1, Math.floor(chatMessages.length / 8));
    const markers: { position: number; label: string; isBookmarked: boolean; isPinned: boolean }[] = [];
    
    for (let i = 0; i < chatMessages.length; i += interval) {
      const msg = chatMessages[i];
      const position = (i / (chatMessages.length - 1)) * 100;
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      markers.push({
        position,
        label: `#${i + 1} ${time}`,
        isBookmarked: !!msg.isBookmarked,
        isPinned: !!msg.isPinned
      });
    }
    
    return markers;
  }, [chatMessages]);

  // 计算对话连续性统计
  const computedConversationStats = useMemo(() => {
    if (chatMessages.length === 0) return null;

    // 计算平均响应时间
    const responseTimes = chatMessages.filter(m => m.responseTime).map(m => m.responseTime!);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // 计算连续对话模式（同一天内的连续问答轮次）
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate = '';
    
    chatMessages.forEach(msg => {
      if (msg.timestamp) {
        const msgDate = new Date(msg.timestamp).toDateString();
        if (msgDate === lastDate || lastDate === '') {
          currentStreak++;
        } else {
          if (currentStreak > longestStreak) longestStreak = currentStreak;
          currentStreak = 1;
        }
        lastDate = msgDate;
      }
    });
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    // 估算编辑次数（基于书签和置顶操作）
    const markedMessages = chatMessages.filter(m => m.isBookmarked || m.isPinned).length;

    return {
      totalMessages: chatMessages.length,
      userMessages: chatMessages.filter(m => m.role === 'user').length,
      aiMessages: chatMessages.filter(m => m.role === 'model').length,
      avgResponseTime: Math.round(avgResponseTime),
      longestStreak,
      currentStreak,
      bookmarkedCount: chatMessages.filter(m => m.isBookmarked).length,
      pinnedCount: chatMessages.filter(m => m.isPinned).length,
      avgRating: chatMessages.filter(m => m.rating).length > 0
        ? (chatMessages.filter(m => m.rating).reduce((a, b) => a + (b.rating || 0), 0) / chatMessages.filter(m => m.rating).length).toFixed(1)
        : null,
      regenerateCount: conversationStats.regenerateCount,
      editCount: markedMessages
    };
  }, [chatMessages, conversationStats.regenerateCount]);

  // 导出对话为 Markdown
  const handleExportConversation = useCallback((format: 'markdown' | 'json' | 'txt' | 'html' = 'markdown') => {
    if (chatMessages.length === 0) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify({
          exportedAt: new Date().toISOString(),
          messageCount: chatMessages.length,
          messages: chatMessages.map(msg => ({
            role: msg.role,
            text: msg.text,
            timestamp: msg.timestamp?.toISOString(),
            isBookmarked: msg.isBookmarked,
            rating: msg.rating,
            isPinned: msg.isPinned,
            responseTime: msg.responseTime,
            tokenCount: msg.tokenCount
          }))
        }, null, 2);
        filename = `ai-conversation-${timestamp}.json`;
        mimeType = 'application/json';
        break;
      
      case 'txt':
        content = chatMessages.map((msg, idx) => {
          const role = msg.role === 'user' ? '用户' : 'AI 助手';
          const time = msg.timestamp ? ` (${msg.timestamp.toLocaleString()})` : '';
          return `[${role}${time}]\n${msg.text}\n`;
        }).join('\n' + '='.repeat(50) + '\n\n');
        content = `AI 对话导出\n导出时间: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n` + content;
        filename = `ai-conversation-${timestamp}.txt`;
        mimeType = 'text/plain';
        break;
      
      case 'html':
        const htmlMessages = chatMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const bgColor = isUser ? '#e3f2fd' : '#f5f5f5';
          const label = isUser ? '👤 用户' : '🤖 AI 助手';
          const time = msg.timestamp ? `<small style="color:#888;">${msg.timestamp.toLocaleString()}</small>` : '';
          return `
            <div style="margin:16px 0;padding:16px;background:${bgColor};border-radius:12px;">
              <div style="font-weight:bold;margin-bottom:8px;">${label} ${time}</div>
              <div style="white-space:pre-wrap;">${msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `;
        }).join('');
        content = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 对话导出</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #333; }
    .meta { text-align: center; color: #888; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>🤖 AI 对话导出</h1>
  <p class="meta">导出时间: ${new Date().toLocaleString()} | 消息数: ${chatMessages.length}</p>
  ${htmlMessages}
</body>
</html>`;
        filename = `ai-conversation-${timestamp}.html`;
        mimeType = 'text/html';
        break;
      
      default: // markdown
        const markdown = chatMessages.map((msg, idx) => {
          const role = msg.role === 'user' ? '👤 用户' : '🤖 AI 助手';
          return `### ${role}\n\n${msg.text}\n`;
        }).join('\n---\n\n');
        content = `# AI 对话导出\n\n导出时间: ${new Date().toLocaleString()}\n\n---\n\n` + markdown;
        filename = `ai-conversation-${timestamp}.md`;
        mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [chatMessages]);

  // 清空当前对话
  const handleClearConversation = useCallback(() => {
    if (chatMessages.length === 0) return;
    if (confirm('确定要清空当前对话吗？此操作不可撤销。')) {
      setChatMessages([]);
      setCurrentConversationId(null);
      setCurrentConversationMeta(null);
    }
  }, [chatMessages]);

  // 编辑用户消息并重新发送
  const handleEditMessage = useCallback((messageIndex: number, newText: string) => {
    // 删除该消息及之后的所有消息
    const updatedMessages = chatMessages.slice(0, messageIndex);
    setChatMessages(updatedMessages);
    
    // 设置新的输入文本并自动发送
    setInputText(newText);
    
    // 使用 setTimeout 确保状态更新后再发送
    setTimeout(() => {
      // 模拟发送
      const sendEvent = new CustomEvent('ai-chat-send', { detail: { text: newText } });
      window.dispatchEvent(sendEvent);
    }, 100);
  }, [chatMessages]);

  // 从某条消息创建对话分支（Fork）
  const handleForkConversation = useCallback((messageIndex: number) => {
    // 获取到该消息为止的所有消息
    const branchMessages = chatMessages.slice(0, messageIndex + 1);
    
    // 创建新的对话（清除当前对话 ID）
    setCurrentConversationId(null);
    setCurrentConversationMeta(null);
    setChatMessages(branchMessages);
    
    // 显示提示
    alert(`已从第 ${messageIndex + 1} 条消息创建分支，您可以继续对话。`);
  }, [chatMessages]);

  // Phase 22: 切换消息书签
  const toggleMessageBookmark = useCallback((messageId: string) => {
    setMessageBookmarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      // 持久化到 localStorage
      localStorage.setItem('chatMessageBookmarks', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Phase 22: 加载书签
  useEffect(() => {
    const saved = localStorage.getItem('chatMessageBookmarks');
    if (saved) {
      try {
        setMessageBookmarks(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('加载书签失败:', e);
      }
    }
  }, []);

  // Phase 22: 获取书签消息
  const bookmarkedMessages = useMemo(() => {
    return chatMessages.filter(m => messageBookmarks.has(m.id));
  }, [chatMessages, messageBookmarks]);

  // 切换消息书签状态 (Phase 22: 同时更新书签 Set)
  const handleToggleBookmark = useCallback((messageIndex: number) => {
    setChatMessages(prev => {
      const newMessages = prev.map((msg, idx) => 
        idx === messageIndex 
          ? { ...msg, isBookmarked: !msg.isBookmarked }
          : msg
      );
      // Phase 22: 同步更新 messageBookmarks
      const targetMsg = newMessages[messageIndex];
      if (targetMsg) {
        toggleMessageBookmark(targetMsg.id);
      }
      return newMessages;
    });
  }, [toggleMessageBookmark]);

  // 删除消息
  const handleDeleteMessage = useCallback((messageIndex: number) => {
    setChatMessages(prev => {
      const newMessages = [...prev];
      // 如果删除的是用户消息，同时删除对应的AI回复（如果紧邻的下一条是AI消息）
      if (newMessages[messageIndex]?.role === 'user' && 
          newMessages[messageIndex + 1]?.role === 'model') {
        // 删除用户消息和对应的AI回复
        newMessages.splice(messageIndex, 2);
      } else {
        // 只删除单条消息
        newMessages.splice(messageIndex, 1);
      }
      return newMessages;
    });
  }, []);

  // 消息评分
  const handleRateMessage = useCallback((messageIndex: number, rating: 1 | 2 | 3 | 4 | 5) => {
    setChatMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex 
        ? { ...msg, rating }
        : msg
    ));
  }, []);

  // 切换消息置顶
  const handleTogglePin = useCallback((messageIndex: number) => {
    setChatMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex 
        ? { ...msg, isPinned: !msg.isPinned }
        : msg
    ));
  }, []);

  // 翻译消息
  const handleTranslateMessage = useCallback((messageIndex: number, targetLang: string) => {
    const message = chatMessages[messageIndex];
    if (!message || message.role !== 'model') return;
    
    // 构建翻译请求
    const langNames: Record<string, string> = {
      'zh-CN': '中文',
      'en': '英文',
      'ja': '日语',
      'ko': '韩语',
      'fr': '法语',
      'de': '德语',
    };
    const langName = langNames[targetLang] || targetLang;
    
    // 设置输入文本为翻译请求
    setInputText(`请将以下内容翻译成${langName}：\n\n${message.text.slice(0, 1000)}`);
    textareaRef.current?.focus();
  }, [chatMessages]);

  // 引用回复消息
  const handleQuoteReply = useCallback((quoteText: string) => {
    setReplyingToMessage({ 
      id: Date.now().toString(), 
      text: quoteText 
    });
    // 聚焦输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  // 取消引用
  const handleCancelQuote = useCallback(() => {
    setReplyingToMessage(null);
  }, []);

  // 加载保存的模板
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-templates');
      if (saved) {
        setSavedTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  // 加载对话标签
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem('ai-conversation-tags');
      if (savedTags) {
        setConversationTags(JSON.parse(savedTags));
      }
    } catch (e) {
      console.error('Failed to load conversation tags:', e);
    }
  }, []);

  // Phase 14: 加载快捷回复
  useEffect(() => {
    try {
      const savedReplies = localStorage.getItem('ai-quick-replies');
      if (savedReplies) {
        setQuickReplies(JSON.parse(savedReplies));
      }
    } catch (e) {
      console.error('Failed to load quick replies:', e);
    }
  }, []);

  // Phase 14: 加载对话文件夹
  useEffect(() => {
    try {
      const savedFolders = localStorage.getItem('ai-conversation-folders');
      if (savedFolders) {
        setConversationFolders(JSON.parse(savedFolders));
      }
    } catch (e) {
      console.error('Failed to load conversation folders:', e);
    }
  }, []);

  // 保存对话标签到 localStorage
  const saveConversationTags = useCallback((tags: Record<string, string[]>) => {
    setConversationTags(tags);
    localStorage.setItem('ai-conversation-tags', JSON.stringify(tags));
  }, []);

  // 为对话添加标签
  const handleAddTag = useCallback((conversationId: string, tag: string) => {
    if (!tag.trim()) return;
    const newTags = { ...conversationTags };
    if (!newTags[conversationId]) {
      newTags[conversationId] = [];
    }
    if (!newTags[conversationId].includes(tag.trim())) {
      newTags[conversationId] = [...newTags[conversationId], tag.trim()];
      saveConversationTags(newTags);
    }
  }, [conversationTags, saveConversationTags]);

  // 从对话移除标签
  const handleRemoveTag = useCallback((conversationId: string, tag: string) => {
    const newTags = { ...conversationTags };
    if (newTags[conversationId]) {
      newTags[conversationId] = newTags[conversationId].filter(t => t !== tag);
      if (newTags[conversationId].length === 0) {
        delete newTags[conversationId];
      }
      saveConversationTags(newTags);
    }
  }, [conversationTags, saveConversationTags]);

  // Phase 14: 消息版本历史管理
  const saveMessageVersion = useCallback((messageIndex: number, newContent: string) => {
    setMessageVersions(prev => {
      const versions = prev[messageIndex] || [];
      const currentMessage = chatMessages[messageIndex];
      // 保存当前版本到历史（如果不存在）
      if (versions.length === 0 && currentMessage) {
        versions.push(currentMessage.text);
      }
      // 添加新版本
      if (newContent !== versions[versions.length - 1]) {
        versions.push(newContent);
      }
      return { ...prev, [messageIndex]: versions };
    });
  }, [chatMessages]);

  // 恢复到历史版本
  const restoreVersion = useCallback((messageIndex: number, versionIndex: number) => {
    const versions = messageVersions[messageIndex];
    if (versions && versions[versionIndex]) {
      setChatMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, text: versions[versionIndex] } : msg
      ));
      setShowVersionHistory(null);
    }
  }, [messageVersions]);

  // Phase 14: 快捷回复管理
  const handleQuickReply = useCallback((reply: string) => {
    setInputText(reply);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  }, []);

  const addQuickReply = useCallback((reply: string) => {
    if (!reply.trim() || quickReplies.includes(reply.trim())) return;
    const newReplies = [...quickReplies, reply.trim()];
    setQuickReplies(newReplies);
    localStorage.setItem('ai-quick-replies', JSON.stringify(newReplies));
  }, [quickReplies]);

  const removeQuickReply = useCallback((reply: string) => {
    const newReplies = quickReplies.filter(r => r !== reply);
    setQuickReplies(newReplies);
    localStorage.setItem('ai-quick-replies', JSON.stringify(newReplies));
  }, [quickReplies]);

  // Phase 14: 对话文件夹管理
  const saveConversationFolder = useCallback((conversationId: string, folder: string) => {
    const newFolders = { ...conversationFolders, [conversationId]: folder };
    setConversationFolders(newFolders);
    localStorage.setItem('ai-conversation-folders', JSON.stringify(newFolders));
  }, [conversationFolders]);

  // 获取所有文件夹列表
  const allFolders = useMemo(() => {
    const folders = new Set<string>();
    Object.values(conversationFolders).forEach(f => f && folders.add(f));
    return Array.from(folders).sort();
  }, [conversationFolders]);

  // Phase 14: 多选消息操作
  const toggleMessageSelection = useCallback((index: number) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedMessages.size === 0) return;
    setChatMessages(prev => prev.filter((_, idx) => !selectedMessages.has(idx)));
    setSelectedMessages(new Set());
    setIsMultiSelectMode(false);
  }, [selectedMessages]);

  const handleBulkBookmark = useCallback(() => {
    if (selectedMessages.size === 0) return;
    setChatMessages(prev => prev.map((msg, idx) => 
      selectedMessages.has(idx) ? { ...msg, isBookmarked: !msg.isBookmarked } : msg
    ));
    setSelectedMessages(new Set());
  }, [selectedMessages]);

  const handleBulkExport = useCallback(() => {
    if (selectedMessages.size === 0) return;
    const selected = chatMessages.filter((_, idx) => selectedMessages.has(idx));
    const content = selected.map(msg => `**${msg.role === 'user' ? '用户' : 'AI'}**:\n${msg.text}`).join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-messages-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setSelectedMessages(new Set());
    setIsMultiSelectMode(false);
  }, [chatMessages, selectedMessages]);

  // Phase 15: TTS 语音朗读
  const handleSpeakMessage = useCallback((text: string, messageIndex: number) => {
    if (!('speechSynthesis' in window)) {
      console.warn('浏览器不支持语音合成');
      return;
    }

    // 如果正在朗读同一条消息，则停止
    if (isSpeaking && speakingMessageIndex === messageIndex) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
      return;
    }

    // 停止之前的朗读
    window.speechSynthesis.cancel();

    // 清理 Markdown 语法
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '代码块已省略') // 移除代码块
      .replace(/`[^`]+`/g, '') // 移除行内代码
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接只保留文字
      .replace(/[#*_~]/g, '') // 移除 Markdown 格式符号
      .replace(/\n+/g, '。'); // 换行转句号

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageIndex(messageIndex);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, speakingMessageIndex]);

  // Phase 15: 停止语音朗读
  const handleStopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageIndex(null);
  }, []);

  // Phase 15: 剪贴板图片粘贴处理
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // 添加到附件列表
          setAttachments(prev => [...prev, file]);
          // 处理文件
          try {
            const processed = await processFileForAI(file);
            setProcessedFiles(prev => [...prev, processed]);
          } catch (error) {
            console.error('处理粘贴图片失败:', error);
          }
        }
        break;
      }
    }
  }, []);

  // Phase 15: 代码主题切换
  const codeThemes = [
    { id: 'github', name: 'GitHub', icon: '☀️' },
    { id: 'monokai', name: 'Monokai', icon: '🌙' },
    { id: 'dracula', name: 'Dracula', icon: '🧛' },
    { id: 'nord', name: 'Nord', icon: '❄️' },
  ] as const;

  // Phase 16: 更新搜索高亮（与对话搜索联动）
  useEffect(() => {
    if (chatSearchQuery) {
      setSearchHighlight(chatSearchQuery);
    } else {
      setSearchHighlight('');
    }
  }, [chatSearchQuery]);

  // Phase 16: 估算对话成本
  const estimatedConversationCost = useMemo(() => {
    // 价格参考 (USD per 1K tokens):
    // GPT-4: $0.03 input, $0.06 output
    // GPT-3.5: $0.0005 input, $0.0015 output
    // Claude: $0.008 input, $0.024 output
    // Gemini: $0.00025 input, $0.0005 output
    
    const totalTokens = chatMessages.reduce((sum, msg) => sum + (msg.tokenCount || Math.round(msg.text.length * 0.7)), 0);
    const inputTokens = chatMessages.filter(m => m.role === 'user').reduce((sum, msg) => sum + (msg.tokenCount || Math.round(msg.text.length * 0.7)), 0);
    const outputTokens = totalTokens - inputTokens;
    
    // 使用中等价格估算 (类似 GPT-3.5)
    const inputCost = (inputTokens / 1000) * 0.0005;
    const outputCost = (outputTokens / 1000) * 0.0015;
    const totalCost = (inputCost + outputCost) * 100; // 转换为美分
    
    return {
      totalTokens,
      inputTokens,
      outputTokens,
      costUSD: inputCost + outputCost,
      costCents: Math.round(totalCost * 100) / 100
    };
  }, [chatMessages]);

  // Phase 16: 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不在输入框时才响应快捷键
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      
      // Ctrl/Cmd + / 显示快捷键帮助
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsHelp(prev => !prev);
        return;
      }
      
      // 以下快捷键仅在非输入状态下生效
      if (isTyping) return;
      
      // N - 新对话
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNewChat();
      }
      // / - 聚焦搜索
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowChatSearch(true);
      }
      // Escape - 关闭弹窗
      if (e.key === 'Escape') {
        setShowShortcutsHelp(false);
        setShowAnalytics(false);
        setShowExportMenu(false);
      }
      // M - 切换多选模式
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsMultiSelectMode(prev => !prev);
        if (isMultiSelectMode) setSelectedMessages(new Set());
      }
      // B - 滚动到底部
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        scrollToBottom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMultiSelectMode]);

  // Phase 17: 保存分支和快照到 localStorage
  useEffect(() => {
    localStorage.setItem('aiignite-conversation-branches', JSON.stringify(conversationBranches));
  }, [conversationBranches]);

  useEffect(() => {
    localStorage.setItem('aiignite-conversation-snapshots', JSON.stringify(conversationSnapshots));
  }, [conversationSnapshots]);

  // Phase 17: 消息拖拽排序处理
  const handleMessageDragStart = useCallback((e: React.DragEvent, messageId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedMessageId(messageId);
  }, []);

  const handleMessageDragOver = useCallback((e: React.DragEvent, messageId: string) => {
    e.preventDefault();
    if (draggedMessageId && draggedMessageId !== messageId) {
      setDragOverMessageId(messageId);
    }
  }, [draggedMessageId]);

  const handleMessageDragLeave = useCallback(() => {
    setDragOverMessageId(null);
  }, []);

  const handleMessageDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedMessageId || draggedMessageId === targetId) return;

    setChatMessages(prev => {
      const messages = [...prev];
      const draggedIdx = messages.findIndex(m => m.id === draggedMessageId);
      const targetIdx = messages.findIndex(m => m.id === targetId);
      
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const [draggedMsg] = messages.splice(draggedIdx, 1);
      messages.splice(targetIdx, 0, draggedMsg);
      return messages;
    });

    setDraggedMessageId(null);
    setDragOverMessageId(null);
  }, [draggedMessageId]);

  const handleMessageDragEnd = useCallback(() => {
    setDraggedMessageId(null);
    setDragOverMessageId(null);
  }, []);

  // Phase 17: 从消息创建对话分支
  const createBranchFromMessage = useCallback((messageIndex: number) => {
    if (!currentConversationId) return;
    
    // 获取到当前消息为止的所有消息
    const branchMessages = chatMessages.slice(0, messageIndex + 1);
    const branchId = `branch-${Date.now()}`;
    
    // 保存为新对话
    const branchTitle = `🌿 ${branchMessages[0]?.text.slice(0, 20) || '分支对话'}...`;
    
    // 更新分支索引
    setConversationBranches(prev => ({
      ...prev,
      [currentConversationId]: [...(prev[currentConversationId] || []), branchId]
    }));
    
    // 创建新对话并切换
    const newConv = {
      id: branchId,
      title: branchTitle,
      model: selectedModel,
      messages: branchMessages.length,
      lastActive: new Date().toISOString(),
      isLocal: true
    };
    
    setConversations(prev => [...prev, newConv]);
    setCurrentConversationId(branchId);
    setChatMessages(branchMessages);
  }, [currentConversationId, chatMessages, selectedModel]);

  // Phase 17: 合并选中的消息
  const handleMergeMessages = useCallback(() => {
    if (selectedMessages.size < 2) return;
    
    const indices = Array.from(selectedMessages).sort((a, b) => a - b);
    const messagesToCombine = indices.map(idx => chatMessages[idx]);
    
    // 创建合并后的消息
    const mergedContent = messagesToCombine.map((msg, idx) => {
      const prefix = msg.role === 'user' ? '👤 用户' : '🤖 AI';
      return `**${prefix} (合并 ${idx + 1}/${messagesToCombine.length})**:\n${msg.text}`;
    }).join('\n\n---\n\n');
    
    const mergedMessage = {
      ...messagesToCombine[0],
      id: `merged-${Date.now()}`,
      text: mergedContent,
      role: 'model' as const,
      isMerged: true,
      mergedFrom: indices.length
    };
    
    // 替换消息
    setChatMessages(prev => {
      const newMessages = prev.filter((_, idx) => !selectedMessages.has(idx));
      // 在第一个被合并消息的位置插入
      newMessages.splice(indices[0], 0, mergedMessage);
      return newMessages;
    });
    
    setSelectedMessages(new Set());
    setIsMultiSelectMode(false);
    setShowMergeDialog(false);
  }, [selectedMessages, chatMessages]);

  // Phase 17: 保存对话快照
  const saveConversationSnapshot = useCallback((name?: string) => {
    if (!currentConversationId || chatMessages.length === 0) return;
    
    const snapshotName = name || `快照 ${new Date().toLocaleString('zh-CN')}`;
    const snapshot = {
      id: `snapshot-${Date.now()}`,
      name: snapshotName,
      timestamp: Date.now(),
      conversationId: currentConversationId,
      messages: [...chatMessages]
    };
    
    setConversationSnapshots(prev => [...prev, snapshot]);
  }, [currentConversationId, chatMessages]);

  // Phase 17: 恢复对话快照
  const restoreSnapshot = useCallback((snapshotId: string) => {
    const snapshot = conversationSnapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;
    
    // 恢复消息
    setChatMessages(snapshot.messages);
    setCurrentConversationId(snapshot.conversationId);
    setShowSnapshotsPanel(false);
  }, [conversationSnapshots]);

  // Phase 17: 删除快照
  const deleteSnapshot = useCallback((snapshotId: string) => {
    setConversationSnapshots(prev => prev.filter(s => s.id !== snapshotId));
  }, []);

  // Phase 17: 获取当前对话的快照
  const currentConversationSnapshots = useMemo(() => {
    if (!currentConversationId) return [];
    return conversationSnapshots.filter(s => s.conversationId === currentConversationId);
  }, [currentConversationId, conversationSnapshots]);

  // Phase 18: 自动草稿保存
  useEffect(() => {
    if (!currentConversationId || chatMessages.length === 0) return;
    
    // 每30秒自动保存草稿
    const draftInterval = setInterval(() => {
      const draftKey = `aiignite-draft-${currentConversationId}`;
      const draft = {
        conversationId: currentConversationId,
        messages: chatMessages,
        savedAt: Date.now(),
        inputText: inputText
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setAutoDraftSaved(true);
      setLastDraftSaveTime(new Date());
      
      // 3秒后隐藏保存提示
      setTimeout(() => setAutoDraftSaved(false), 3000);
    }, 30000);
    
    return () => clearInterval(draftInterval);
  }, [currentConversationId, chatMessages, inputText]);

  // Phase 18: 恢复草稿
  const restoreDraft = useCallback(() => {
    if (!currentConversationId) return;
    const draftKey = `aiignite-draft-${currentConversationId}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.messages) setChatMessages(draft.messages);
        if (draft.inputText) setInputText(draft.inputText);
      }
    } catch (e) {
      console.error('恢复草稿失败:', e);
    }
  }, [currentConversationId]);

  // Phase 18: 对话记忆摘要
  const conversationMemorySummary = useMemo(() => {
    if (chatMessages.length === 0) return null;
    
    // 提取关键信息
    const userMessages = chatMessages.filter(m => m.role === 'user');
    const aiMessages = chatMessages.filter(m => m.role === 'model');
    
    // 提取主题关键词（简单实现）
    const allText = chatMessages.map(m => m.text).join(' ');
    const keywordPatterns = [
      { pattern: /代码|编程|程序|函数|变量|类|方法/gi, topic: '编程开发' },
      { pattern: /设计|UI|UX|界面|样式|颜色/gi, topic: '设计相关' },
      { pattern: /数据|分析|统计|报表|图表/gi, topic: '数据分析' },
      { pattern: /学习|教程|如何|怎么|方法/gi, topic: '学习求助' },
      { pattern: /写作|文章|内容|文案|标题/gi, topic: '内容创作' },
      { pattern: /翻译|英文|中文|语言/gi, topic: '翻译工作' },
    ];
    
    const detectedTopics: string[] = [];
    keywordPatterns.forEach(({ pattern, topic }) => {
      if (pattern.test(allText) && !detectedTopics.includes(topic)) {
        detectedTopics.push(topic);
      }
    });
    
    // 提取代码片段数量
    const codeBlockCount = (allText.match(/```[\s\S]*?```/g) || []).length;
    
    // 提取链接数量
    const linkCount = (allText.match(/https?:\/\/[^\s]+/g) || []).length;
    
    return {
      totalMessages: chatMessages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      topics: detectedTopics,
      codeBlockCount,
      linkCount,
      firstMessageTime: chatMessages[0]?.timestamp,
      lastMessageTime: chatMessages[chatMessages.length - 1]?.timestamp
    };
  }, [chatMessages]);

  // Phase 18: 智能跟进问题生成
  const generateFollowUpQuestions = useCallback(() => {
    if (chatMessages.length < 2) return;
    
    const lastAIMessage = [...chatMessages].reverse().find(m => m.role === 'model');
    if (!lastAIMessage) return;
    
    const text = lastAIMessage.text.toLowerCase();
    const suggestions: string[] = [];
    
    // 基于内容类型生成跟进问题
    if (/代码|函数|方法|类/.test(text)) {
      suggestions.push('能否解释一下这段代码的工作原理？');
      suggestions.push('如何优化这段代码的性能？');
      suggestions.push('这种实现有什么潜在的问题吗？');
    }
    
    if (/步骤|流程|方法/.test(text)) {
      suggestions.push('能详细说明第一步吗？');
      suggestions.push('有没有更简单的方法？');
      suggestions.push('这个过程中需要注意什么？');
    }
    
    if (/可以|建议|推荐/.test(text)) {
      suggestions.push('还有其他的选择吗？');
      suggestions.push('能比较一下各个选项的优缺点吗？');
    }
    
    if (/例如|比如|举例/.test(text)) {
      suggestions.push('能给更多例子吗？');
      suggestions.push('有没有反面的例子？');
    }
    
    // 通用跟进问题
    if (suggestions.length === 0) {
      suggestions.push('能再详细解释一下吗？');
      suggestions.push('有没有相关的资源推荐？');
      suggestions.push('这个在实际应用中怎么用？');
    }
    
    setSuggestedFollowUps(suggestions.slice(0, 3));
  }, [chatMessages]);

  // Phase 18: 响应超时检测
  useEffect(() => {
    if (isGenerating && !responseStartTime) {
      setResponseStartTime(Date.now());
      setResponseTimeout(false);
      
      // 60秒超时提醒
      responseTimeoutRef.current = setTimeout(() => {
        setResponseTimeout(true);
      }, 60000);
    }
    
    if (!isGenerating) {
      setResponseStartTime(null);
      setResponseTimeout(false);
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
      
      // 生成完成后更新跟进问题
      generateFollowUpQuestions();
    }
    
    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    };
  }, [isGenerating, generateFollowUpQuestions]);

  // Phase 19: 消息气泡主题配置
  const bubbleThemes = [
    { id: 'default', name: '经典', icon: '💬', description: '清晰简洁的默认样式' },
    { id: 'minimal', name: '极简', icon: '🔲', description: '无边框极简风格' },
    { id: 'gradient', name: '渐变', icon: '🌈', description: '现代渐变效果' },
    { id: 'glass', name: '毛玻璃', icon: '✨', description: '半透明毛玻璃效果' },
  ] as const;

  // Phase 19: 获取当前气泡样式类名
  const getBubbleThemeClass = useCallback((role: 'user' | 'assistant') => {
    const baseClass = role === 'user' ? 'ml-auto' : 'mr-auto';
    
    switch (bubbleTheme) {
      case 'minimal':
        return `${baseClass} ${role === 'user' 
          ? 'bg-transparent border-none' 
          : 'bg-transparent border-none'}`;
      case 'gradient':
        return `${baseClass} ${role === 'user'
          ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800'}`;
      case 'glass':
        return `${baseClass} ${role === 'user'
          ? 'bg-primary/80 backdrop-blur-md text-white border border-primary/50'
          : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50'}`;
      default:
        return baseClass;
    }
  }, [bubbleTheme]);

  // Phase 19: 当前模型信息
  const currentModelInfo = useMemo(() => {
    if (!selectedModel) return null;
    
    const modelMap: { [key: string]: { provider: string; icon: string; color: string; description: string } } = {
      'gemini-pro': { provider: 'Google', icon: '✨', color: 'blue', description: 'Google AI 基础模型' },
      'gemini-1.5-pro': { provider: 'Google', icon: '🌟', color: 'blue', description: 'Google AI 增强模型' },
      'gemini-1.5-flash': { provider: 'Google', icon: '⚡', color: 'cyan', description: 'Google AI 快速模型' },
      'gpt-3.5-turbo': { provider: 'OpenAI', icon: '💬', color: 'green', description: 'ChatGPT 标准模型' },
      'gpt-4': { provider: 'OpenAI', icon: '🧠', color: 'purple', description: 'GPT-4 高级模型' },
      'gpt-4o': { provider: 'OpenAI', icon: '🎯', color: 'purple', description: 'GPT-4 Omni 多模态' },
      'claude-3-sonnet': { provider: 'Anthropic', icon: '🎵', color: 'orange', description: 'Claude 3 均衡模型' },
      'claude-3-opus': { provider: 'Anthropic', icon: '🎼', color: 'red', description: 'Claude 3 旗舰模型' },
      'glm-4': { provider: '智谱AI', icon: '🌏', color: 'indigo', description: 'GLM-4 中文增强' },
    };
    
    return modelMap[selectedModel] || { provider: '自定义', icon: '🤖', color: 'gray', description: selectedModel };
  }, [selectedModel]);

  // Phase 19: 保存主题到 localStorage
  useEffect(() => {
    localStorage.setItem('ai-bubble-theme', bubbleTheme);
  }, [bubbleTheme]);

  // Phase 20: 保存收藏助手到 localStorage
  useEffect(() => {
    localStorage.setItem('ai-favorite-assistants', JSON.stringify(favoriteAssistants));
  }, [favoriteAssistants]);

  // Phase 20: 对话活跃度数据（按小时统计）
  const activityHeatmapData = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    conversations.forEach(conv => {
      if (conv.lastActive) {
        const date = new Date(conv.lastActive);
        hourCounts[date.getHours()]++;
        dayCounts[date.getDay()]++;
      }
    });
    
    return { hourCounts, dayCounts };
  }, [conversations]);

  // Phase 20: 提问优化建议检测
  const analyzePromptQuality = useCallback((text: string) => {
    const tips: string[] = [];
    
    // 太短的问题
    if (text.length < 10) {
      tips.push('💡 问题太短，建议添加更多上下文');
    }
    
    // 没有具体要求
    if (!/请|帮|如何|怎么|什么|为什么|能否|可以/i.test(text)) {
      tips.push('💡 建议明确说明您的需求');
    }
    
    // 可能的模糊表达
    if (/这个|那个|它|它们/i.test(text) && text.length < 50) {
      tips.push('💡 避免使用模糊代词，请具体描述');
    }
    
    // 没有格式要求
    if (text.length > 100 && !/格式|结构|步骤|列表|代码|json|markdown/i.test(text)) {
      tips.push('💡 复杂问题建议指定期望的输出格式');
    }
    
    return tips.length > 0 ? tips[0] : null;
  }, []);

  // Phase 20: 输入时检测提问质量
  useEffect(() => {
    if (inputText.length > 5) {
      const tip = analyzePromptQuality(inputText);
      setPromptOptimizationTip(tip);
    } else {
      setPromptOptimizationTip(null);
    }
  }, [inputText, analyzePromptQuality]);

  // Phase 20: 切换收藏助手
  const toggleFavoriteAssistant = useCallback((assistantId: string) => {
    setFavoriteAssistants(prev => {
      if (prev.includes(assistantId)) {
        return prev.filter(id => id !== assistantId);
      } else {
        return [...prev, assistantId];
      }
    });
  }, []);

  // Phase 21: 自动生成对话标题
  const generateConversationTitle = useCallback(() => {
    if (chatMessages.length < 2) return null;
    
    const firstUserMsg = chatMessages.find(m => m.role === 'user');
    if (!firstUserMsg) return null;
    
    // 从第一条用户消息提取关键词作为标题
    let title = firstUserMsg.text
      .replace(/[\n\r]/g, ' ')
      .replace(/```[\s\S]*?```/g, '[代码]')
      .slice(0, 50);
    
    if (firstUserMsg.text.length > 50) {
      title += '...';
    }
    
    return title;
  }, [chatMessages]);

  // Phase 21: 导出对话为代码格式
  const exportAsCode = useCallback((language: 'python' | 'javascript' | 'json') => {
    if (chatMessages.length === 0) return;
    
    let code = '';
    
    switch (language) {
      case 'python':
        code = `# AI 对话记录\n# 生成时间: ${new Date().toLocaleString('zh-CN')}\n\nconversation = [\n`;
        chatMessages.forEach(msg => {
          const text = msg.text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          code += `    {"role": "${msg.role}", "content": "${text}"},\n`;
        });
        code += ']\n\n# 使用示例\nfor message in conversation:\n    print(f"{message[\'role\']}: {message[\'content\'][:50]}...")';
        break;
        
      case 'javascript':
        code = `// AI 对话记录\n// 生成时间: ${new Date().toLocaleString('zh-CN')}\n\nconst conversation = [\n`;
        chatMessages.forEach(msg => {
          const text = msg.text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          code += `  { role: "${msg.role}", content: "${text}" },\n`;
        });
        code += '];\n\n// 使用示例\nconversation.forEach(msg => console.log(`${msg.role}: ${msg.content.slice(0, 50)}...`));';
        break;
        
      case 'json':
        code = JSON.stringify({
          exportedAt: new Date().toISOString(),
          model: selectedModel,
          assistant: currentAssistant?.name,
          messages: chatMessages.map(m => ({
            role: m.role,
            content: m.text,
            timestamp: m.timestamp,
            tokenCount: m.tokenCount
          }))
        }, null, 2);
        break;
    }
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.${language === 'json' ? 'json' : language === 'python' ? 'py' : 'js'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  }, [chatMessages, selectedModel, currentAssistant]);

  // Phase 21: 导出对话为文档格式
  const exportAsDocument = useCallback((format: 'markdown' | 'html') => {
    if (chatMessages.length === 0) return;
    
    let content = '';
    const title = generateConversationTitle() || '对话记录';
    
    if (format === 'markdown') {
      content = `# ${title}\n\n`;
      content += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
      content += `> 模型: ${selectedModel}\n`;
      if (currentAssistant) content += `> 助手: ${currentAssistant.name}\n`;
      content += '\n---\n\n';
      
      chatMessages.forEach((msg, idx) => {
        const role = msg.role === 'user' ? '👤 用户' : '🤖 AI';
        content += `## ${role}\n\n${msg.text}\n\n`;
        if (idx < chatMessages.length - 1) content += '---\n\n';
      });
    } else {
      content = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .message { margin-bottom: 20px; padding: 15px; border-radius: 10px; }
    .user { background: #e0e7ff; }
    .ai { background: #f3f4f6; }
    .role { font-weight: bold; margin-bottom: 10px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { font-family: 'Fira Code', Consolas, monospace; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
    <p>模型: ${selectedModel}</p>
    ${currentAssistant ? `<p>助手: ${currentAssistant.name}</p>` : ''}
  </div>
`;
      chatMessages.forEach(msg => {
        const roleClass = msg.role === 'user' ? 'user' : 'ai';
        const roleName = msg.role === 'user' ? '👤 用户' : '🤖 AI';
        const htmlContent = msg.text
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
          .replace(/\n/g, '<br>');
        content += `  <div class="message ${roleClass}">
    <div class="role">${roleName}</div>
    <div class="content">${htmlContent}</div>
  </div>\n`;
      });
      content += '</body>\n</html>';
    }
    
    const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.${format === 'html' ? 'html' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  }, [chatMessages, selectedModel, currentAssistant, generateConversationTitle]);

  // Phase 21: 监听对话变化自动生成标题建议
  // 只在首次问答后显示，且对话标题是默认标题时才显示
  useEffect(() => {
    // 等待AI生成完成
    if (isGenerating) return;
    
    const currentConvId = selectedConversation?.id;
    const isDismissed = currentConvId ? dismissedTitleConversations.has(currentConvId) : false;
    if (isDismissed) return;
    
    // 检查是否有用户发送的消息（表示有真正的对话）
    const hasUserMessage = chatMessages.some(m => m.role === 'user');
    // 检查是否有AI回复（除了欢迎语外还有其他回复）
    const modelMessages = chatMessages.filter(m => m.role === 'model');
    const hasAIReply = modelMessages.length >= 2; // 欢迎语 + 至少1条回复
    
    // 没有用户消息或没有AI回复，不显示
    if (!hasUserMessage || !hasAIReply) {
      return;
    }
    
    // 检查当前标题是否是默认标题（助手名称或空标题）
    const currentTitle = selectedConversation?.title || '';
    const assistantName = currentAssistant?.name || '';
    const isDefaultTitle = !currentTitle || 
      currentTitle === assistantName ||
      currentTitle.includes(assistantName) ||
      currentTitle.startsWith('新对话') ||
      /^\d{4}[-/]\d{2}[-/]\d{2}/.test(currentTitle); // 日期格式标题也视为默认
    
    // 只在有对话且是默认标题时显示建议
    if (autoTitleEnabled && isDefaultTitle) {
      const title = generateConversationTitle();
      if (title && title !== generatedTitle) {
        setGeneratedTitle(title);
      }
    }
  }, [chatMessages, autoTitleEnabled, generateConversationTitle, generatedTitle, selectedConversation?.id, selectedConversation?.title, currentAssistant?.name, dismissedTitleConversations, isGenerating]);

  // Phase 22: 高级搜索过滤对话
  const filteredConversationsBySearch = useMemo(() => {
    let result = conversations;
    
    // 文本搜索过滤（已有的 searchQuery）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.messages.some(m => m.text.toLowerCase().includes(query))
      );
    }
    
    // 日期范围过滤
    if (searchDateRange.start) {
      const startDate = new Date(searchDateRange.start);
      result = result.filter(c => new Date(c.createdAt) >= startDate);
    }
    if (searchDateRange.end) {
      const endDate = new Date(searchDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(c => new Date(c.createdAt) <= endDate);
    }
    
    // 助手过滤
    if (searchAssistantFilter) {
      result = result.filter(c => 
        c.messages.some(m => m.assistantId === searchAssistantFilter)
      );
    }
    
    return result;
  }, [conversations, searchQuery, searchDateRange, searchAssistantFilter]);

  // Phase 22: 对话统计数据（简化版）
  const phase22Stats = useMemo(() => {
    if (chatMessages.length === 0) return null;
    
    const userMessages = chatMessages.filter(m => m.role === 'user');
    const assistantMessages = chatMessages.filter(m => m.role === 'model');
    
    const totalUserTokens = userMessages.reduce((sum, m) => sum + (m.text.length / 4), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, m) => sum + (m.text.length / 4), 0);
    
    return {
      totalMessages: chatMessages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      estimatedUserTokens: Math.round(totalUserTokens),
      estimatedAssistantTokens: Math.round(totalAssistantTokens),
      totalTokens: Math.round(totalUserTokens + totalAssistantTokens),
      conversationDuration: chatMessages.length > 1 ? `约 ${Math.ceil(chatMessages.length * 0.5)} 分钟` : '刚开始'
    };
  }, [chatMessages]);

  // Phase 22: 斜杠命令列表
  const slashCommands = useMemo(() => [
    { command: '/clear', description: '清空当前对话', icon: 'delete_sweep', action: () => { setChatMessages([]); setInputText(''); } },
    { command: '/export', description: '导出对话为 Markdown', icon: 'download', action: () => exportAsDocument('markdown') },
    { command: '/json', description: '导出对话为 JSON', icon: 'data_object', action: () => exportAsCode('json') },
    { command: '/stats', description: '显示对话统计', icon: 'analytics', action: () => setShowConversationStats(true) },
    { command: '/bookmarks', description: '查看书签消息', icon: 'bookmarks', action: () => setShowBookmarksOnly(!showBookmarksOnly) },
    { command: '/new', description: '开始新对话', icon: 'add_comment', action: () => { handleNewChat(); setInputText(''); } },
    { command: '/summary', description: '生成对话摘要', icon: 'summarize', action: () => {
      if (chatMessages.length > 0) {
        const summary = chatMessages.slice(0, 3).map(m => `${m.role === 'user' ? '问' : '答'}: ${m.text.slice(0, 30)}...`).join('\n');
        alert(`对话摘要:\n\n${summary}`);
      }
    }},
    { command: '/help', description: '显示快捷键帮助', icon: 'help', action: () => setShowShortcutsHelp(true) }
  ], [showBookmarksOnly, chatMessages, exportAsCode, exportAsDocument, handleNewChat]);

  // Phase 22: 过滤斜杠命令
  const filteredSlashCommands = useMemo(() => {
    if (!slashCommandFilter) return slashCommands;
    return slashCommands.filter(cmd => 
      cmd.command.includes(slashCommandFilter) || 
      cmd.description.includes(slashCommandFilter)
    );
  }, [slashCommands, slashCommandFilter]);

  // Phase 22: 监听输入检测斜杠命令
  useEffect(() => {
    if (inputText.startsWith('/')) {
      setSlashCommandMode(true);
      setSlashCommandFilter(inputText.toLowerCase());
    } else {
      setSlashCommandMode(false);
      setSlashCommandFilter('');
    }
  }, [inputText]);

  // Phase 23: 切换紧凑模式
  const toggleCompactMode = useCallback(() => {
    setCompactMessageMode(prev => {
      const newVal = !prev;
      localStorage.setItem('chatCompactMode', String(newVal));
      return newVal;
    });
  }, []);

  // Phase 23: 智能标签建议（基于对话内容分析）
  const generateSmartTagSuggestions = useCallback((messages: typeof chatMessages) => {
    if (messages.length < 2) {
      setSmartTagSuggestions([]);
      return;
    }
    
    const allText = messages.map(m => m.text).join(' ').toLowerCase();
    const suggestions: string[] = [];
    
    // 编程相关
    if (/python|javascript|typescript|react|vue|node|代码|编程|函数|api/i.test(allText)) {
      suggestions.push('编程');
    }
    if (/css|html|前端|ui|界面|样式|布局/i.test(allText)) {
      suggestions.push('前端');
    }
    if (/数据库|sql|mongodb|redis|后端|服务器/i.test(allText)) {
      suggestions.push('后端');
    }
    // AI 相关
    if (/ai|模型|训练|machine learning|深度学习|神经网络|gpt|llm/i.test(allText)) {
      suggestions.push('AI');
    }
    // 写作相关
    if (/文章|写作|翻译|润色|总结|摘要|报告/i.test(allText)) {
      suggestions.push('写作');
    }
    // 学习相关
    if (/学习|教程|解释|怎么|如何|为什么|什么是/i.test(allText)) {
      suggestions.push('学习');
    }
    // 工作相关
    if (/项目|需求|计划|会议|任务|工作/i.test(allText)) {
      suggestions.push('工作');
    }
    // 创意相关
    if (/设计|创意|头脑风暴|想法|灵感/i.test(allText)) {
      suggestions.push('创意');
    }
    
    setSmartTagSuggestions(suggestions.slice(0, 4)); // 最多4个建议
  }, []);

  // Phase 23: 设置对话优先级
  const setConversationPriorityLevel = useCallback((convId: string, priority: number) => {
    setConversationPriority(prev => {
      const newPriorities = { ...prev, [convId]: priority };
      localStorage.setItem('chatConversationPriorities', JSON.stringify(newPriorities));
      return newPriorities;
    });
  }, []);

  // Phase 23: 加载对话优先级
  useEffect(() => {
    const saved = localStorage.getItem('chatConversationPriorities');
    if (saved) {
      try {
        setConversationPriority(JSON.parse(saved));
      } catch (e) {
        console.error('加载对话优先级失败:', e);
      }
    }
  }, []);

  // Phase 23: 焦点切换
  const handleFocusSwitch = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab' && e.altKey) {
      e.preventDefault();
      setFocusArea(prev => {
        if (prev === 'input') return 'messages';
        if (prev === 'messages') return 'list';
        return 'input';
      });
    }
  }, []);

  // Phase 23: 监听焦点切换快捷键
  useEffect(() => {
    window.addEventListener('keydown', handleFocusSwitch);
    return () => window.removeEventListener('keydown', handleFocusSwitch);
  }, [handleFocusSwitch]);

  // Phase 23: 根据焦点区域自动聚焦
  useEffect(() => {
    if (focusArea === 'input' && textareaRef.current) {
      textareaRef.current.focus();
    } else if (focusArea === 'messages' && messagesContainerRef.current) {
      messagesContainerRef.current.focus();
    }
  }, [focusArea]);

  // Phase 23: 监听对话内容变化生成标签建议
  useEffect(() => {
    if (chatMessages.length >= 2) {
      generateSmartTagSuggestions(chatMessages);
    }
  }, [chatMessages, generateSmartTagSuggestions]);

  // Phase 24: 格式化相对时间
  const formatRelativeTime = useCallback((timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }, []);

  // Phase 24: 格式化本地时间
  const formatLocalTime = useCallback((timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Phase 24: 计算阅读时间估算
  const estimateReadingTime = useCallback((text: string) => {
    // 中文约 300 字/分钟，英文约 200 词/分钟
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const minutes = Math.ceil((chineseChars / 300) + (englishWords / 200));
    return Math.max(1, minutes);
  }, []);

  // Phase 24: 获取模型简短标识
  const getModelShortLabel = useCallback((modelName: string) => {
    const lower = modelName.toLowerCase();
    if (lower.includes('gpt-4')) return { label: 'GPT-4', color: 'bg-emerald-500' };
    if (lower.includes('gpt-3.5')) return { label: 'GPT-3.5', color: 'bg-green-500' };
    if (lower.includes('claude')) return { label: 'Claude', color: 'bg-orange-500' };
    if (lower.includes('gemini')) return { label: 'Gemini', color: 'bg-blue-500' };
    if (lower.includes('llama')) return { label: 'Llama', color: 'bg-purple-500' };
    if (lower.includes('qwen') || lower.includes('通义')) return { label: 'Qwen', color: 'bg-cyan-500' };
    if (lower.includes('deepseek')) return { label: 'DeepSeek', color: 'bg-indigo-500' };
    if (lower.includes('glm') || lower.includes('智谱')) return { label: 'GLM', color: 'bg-red-500' };
    return { label: modelName.slice(0, 6), color: 'bg-gray-500' };
  }, []);

  // Phase 24: 生成分享链接
  const generateShareLink = useCallback(() => {
    if (!selectedConversation || chatMessages.length === 0) return;
    
    // 创建对话摘要数据
    const shareData = {
      title: selectedConversation.title,
      model: selectedModel,
      messages: chatMessages.slice(0, 10).map(m => ({
        role: m.role,
        text: m.text.slice(0, 200)
      })),
      createdAt: new Date().toISOString()
    };
    
    // Base64 编码（简化的分享方案）
    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const link = `${window.location.origin}/share?data=${encoded.slice(0, 100)}`;
    
    setShareableLink(link);
    
    // 复制到剪贴板
    navigator.clipboard.writeText(link).then(() => {
      alert('分享链接已复制到剪贴板！');
    });
    
    setShowShareMenu(false);
  }, [selectedConversation, chatMessages, selectedModel]);

  // Phase 24: 对话消息统计信息
  const messageStats = useMemo(() => {
    if (chatMessages.length === 0) return null;
    
    const totalChars = chatMessages.reduce((sum, m) => sum + m.text.length, 0);
    const readingTime = estimateReadingTime(chatMessages.map(m => m.text).join(' '));
    
    return {
      totalChars,
      readingTime,
      messageCount: chatMessages.length
    };
  }, [chatMessages, estimateReadingTime]);

  // Phase 25: 归档对话
  const archiveConversation = useCallback((convId: string) => {
    setArchivedConversations(prev => {
      const newArchived = [...prev, convId];
      localStorage.setItem('chatArchivedConversations', JSON.stringify(newArchived));
      return newArchived;
    });
  }, []);

  // Phase 25: 取消归档对话
  const unarchiveConversation = useCallback((convId: string) => {
    setArchivedConversations(prev => {
      const newArchived = prev.filter(id => id !== convId);
      localStorage.setItem('chatArchivedConversations', JSON.stringify(newArchived));
      return newArchived;
    });
  }, []);

  // Phase 25: 过滤归档对话
  const visibleConversations = useMemo(() => {
    if (showArchived) {
      return conversations.filter(c => archivedConversations.includes(c.id));
    }
    return conversations.filter(c => !archivedConversations.includes(c.id));
  }, [conversations, archivedConversations, showArchived]);

  // Phase 25: 从模板创建对话
  const createFromPhase25Template = useCallback((template: typeof phase25Templates[0]) => {
    const newConv = {
      id: `conv_${Date.now()}`,
      title: template.name,
      messages: template.firstMessage ? [{
        id: `msg_${Date.now()}`,
        role: 'user' as const,
        text: template.firstMessage,
        timestamp: new Date().toISOString()
      }] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setChatMessages(newConv.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    if (template.firstMessage) {
      setInputText(template.firstMessage);
    }
    setShowTemplateModal(false);
  }, [phase25Templates]);

  // Phase 25: 设置对话提醒
  const setConversationReminder = useCallback((convId: string, reminderTime: Date) => {
    setConversationReminders(prev => {
      const newReminders = { ...prev, [convId]: reminderTime };
      localStorage.setItem('chatConversationReminders', JSON.stringify(
        Object.fromEntries(Object.entries(newReminders).map(([k, v]) => [k, v.toISOString()]))
      ));
      return newReminders;
    });
    alert(`已设置提醒: ${reminderTime.toLocaleString('zh-CN')}`);
  }, []);

  // Phase 25: 检查提醒
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      Object.entries(conversationReminders).forEach(([convId, reminderTime]) => {
        if (new Date(reminderTime) <= now) {
          const conv = conversations.find(c => c.id === convId);
          if (conv) {
            // 显示通知
            if (Notification.permission === 'granted') {
              new Notification('对话提醒', {
                body: `记得继续对话: ${conv.title}`,
                icon: '/favicon.ico'
              });
            }
            // 移除已触发的提醒
            setConversationReminders(prev => {
              const newReminders = { ...prev };
              delete newReminders[convId];
              return newReminders;
            });
          }
        }
      });
    };
    
    const interval = setInterval(checkReminders, 60000); // 每分钟检查
    return () => clearInterval(interval);
  }, [conversationReminders, conversations]);

  // Phase 25: 加载提醒
  useEffect(() => {
    const saved = localStorage.getItem('chatConversationReminders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversationReminders(
          Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, new Date(v as string)]))
        );
      } catch (e) {
        console.error('加载提醒失败:', e);
      }
    }
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Phase 26: 消息反馈持久化
  useEffect(() => {
    localStorage.setItem('chatMessageFeedback', JSON.stringify(messageFeedback));
  }, [messageFeedback]);

  // Phase 26: 设置消息反馈
  const setMessageFeedbackFn = useCallback((msgIndex: number, feedback: 'like' | 'dislike' | null) => {
    setMessageFeedback(prev => {
      const newFeedback = { ...prev };
      if (feedback === null) {
        delete newFeedback[msgIndex];
      } else if (prev[msgIndex] === feedback) {
        // 如果点击相同的反馈，取消它
        delete newFeedback[msgIndex];
      } else {
        newFeedback[msgIndex] = feedback;
      }
      return newFeedback;
    });
  }, []);

  // Phase 26: 插入快捷短语
  const insertQuickPhrase = useCallback((phrase: string) => {
    setInputText(prev => prev + phrase);
    setShowQuickPhrases(false);
    textareaRef.current?.focus();
  }, []);

  // Phase 26: 排序后的对话列表
  const sortedVisibleConversations = useMemo(() => {
    const list = [...visibleConversations];
    switch (conversationSortMode) {
      case 'name':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      case 'messages':
        return list.sort((a, b) => b.messages.length - a.messages.length);
      case 'priority':
        return list.sort((a, b) => (conversationPriority[b.id] || 0) - (conversationPriority[a.id] || 0));
      case 'time':
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [visibleConversations, conversationSortMode, conversationPriority]);

  // Phase 26: 键盘导航消息
  useEffect(() => {
    const handleMessageNavigation = (e: KeyboardEvent) => {
      if (!selectedConversation || !selectedConversation.messages) return;
      const messages = selectedConversation.messages;
      if (messages.length === 0) return;

      if (e.key === 'ArrowUp' && e.altKey && e.shiftKey) {
        e.preventDefault();
        setFocusedMessageIndex(prev => {
          if (prev === null) return messages.length - 1;
          return Math.max(0, prev - 1);
        });
      } else if (e.key === 'ArrowDown' && e.altKey && e.shiftKey) {
        e.preventDefault();
        setFocusedMessageIndex(prev => {
          if (prev === null) return 0;
          return Math.min(messages.length - 1, prev + 1);
        });
      } else if (e.key === 'Escape' && focusedMessageIndex !== null) {
        setFocusedMessageIndex(null);
      } else if (e.key === 'c' && e.altKey && focusedMessageIndex !== null) {
        // Alt+C 复制聚焦消息
        const msg = messages[focusedMessageIndex];
        if (msg) {
          navigator.clipboard.writeText(msg.content);
        }
      }
    };

    window.addEventListener('keydown', handleMessageNavigation);
    return () => window.removeEventListener('keydown', handleMessageNavigation);
  }, [selectedConversation, focusedMessageIndex]);

  // Phase 27: 输入历史持久化
  useEffect(() => {
    localStorage.setItem('chatInputHistory', JSON.stringify(inputHistory.slice(0, 50))); // 只保留最近50条
  }, [inputHistory]);

  // Phase 27: 添加到输入历史
  const addToInputHistory = useCallback((text: string) => {
    if (!text.trim() || text.startsWith('/')) return;
    setInputHistory(prev => {
      const filtered = prev.filter(h => h !== text);
      return [text, ...filtered].slice(0, 50);
    });
    setHistoryIndex(-1);
  }, []);

  // Phase 27: 浏览输入历史
  const navigateInputHistory = useCallback((direction: 'up' | 'down') => {
    if (inputHistory.length === 0) return;
    
    if (direction === 'up') {
      setHistoryIndex(prev => {
        const newIndex = Math.min(prev + 1, inputHistory.length - 1);
        setInputText(inputHistory[newIndex] || '');
        return newIndex;
      });
    } else {
      setHistoryIndex(prev => {
        const newIndex = Math.max(prev - 1, -1);
        if (newIndex === -1) {
          setInputText('');
        } else {
          setInputText(inputHistory[newIndex] || '');
        }
        return newIndex;
      });
    }
  }, [inputHistory]);

  // Phase 27: 消息搜索匹配高亮
  const highlightedMessages = useMemo(() => {
    if (!selectedConversation || !selectedConversation.messages || !messageSearchQuery.trim()) {
      return selectedConversation?.messages || [];
    }
    const query = messageSearchQuery.toLowerCase();
    return selectedConversation.messages.filter(msg => 
      msg.text?.toLowerCase().includes(query)
    );
  }, [selectedConversation, messageSearchQuery]);

  // Phase 27: 消息内容搜索匹配数量（不同于对话搜索）
  const messageContentSearchCount = useMemo(() => {
    if (!messageSearchQuery.trim() || !selectedConversation || !selectedConversation.messages) return 0;
    const query = messageSearchQuery.toLowerCase();
    return selectedConversation.messages.filter(msg => 
      msg.text?.toLowerCase().includes(query)
    ).length;
  }, [selectedConversation, messageSearchQuery]);

  // Phase 27: 输入框字符/词统计
  const inputStats = useMemo(() => {
    const text = inputText;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    return { chars, words, lines, cjkChars };
  }, [inputText]);

  // Phase 27: 智能输入建议（基于历史和常用模式）
  useEffect(() => {
    if (!inputText.trim() || inputText.length < 2) {
      setSmartSuggestions([]);
      return;
    }
    
    const query = inputText.toLowerCase();
    const suggestions: string[] = [];
    
    // 从历史中匹配
    inputHistory.forEach(h => {
      if (h.toLowerCase().startsWith(query) && h !== inputText) {
        suggestions.push(h);
      }
    });
    
    // 常用模式建议
    const patterns = [
      { prefix: '如何', suggestions: ['如何使用', '如何实现', '如何解决', '如何优化'] },
      { prefix: '什么是', suggestions: ['什么是最佳实践', '什么是原理', '什么是区别'] },
      { prefix: '请', suggestions: ['请解释', '请帮我', '请分析', '请生成'] },
      { prefix: '帮我', suggestions: ['帮我写一个', '帮我分析', '帮我优化', '帮我检查'] },
      { prefix: 'how', suggestions: ['how to implement', 'how to fix', 'how to optimize'] },
      { prefix: 'what', suggestions: ['what is the best way', 'what are the differences'] }
    ];
    
    patterns.forEach(p => {
      if (query.startsWith(p.prefix.toLowerCase())) {
        p.suggestions.forEach(s => {
          if (s.toLowerCase().startsWith(query)) {
            suggestions.push(s);
          }
        });
      }
    });
    
    setSmartSuggestions(suggestions.slice(0, 5));
  }, [inputText, inputHistory]);

  // Phase 28: AI 角色风格持久化
  useEffect(() => {
    localStorage.setItem('chatAiPersona', aiPersona);
  }, [aiPersona]);

  // Phase 28: 切换消息折叠
  const toggleMessageCollapse = useCallback((msgIndex: number) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgIndex)) {
        newSet.delete(msgIndex);
      } else {
        newSet.add(msgIndex);
      }
      return newSet;
    });
  }, []);

  // Phase 28: 全部折叠/展开
  const toggleAllCollapse = useCallback((collapse: boolean) => {
    if (!selectedConversation || !selectedConversation.messages) return;
    if (collapse) {
      const allIndices = new Set<number>(selectedConversation.messages.map((_, i) => i).filter(i => selectedConversation.messages[i].role === 'model'));
      setCollapsedMessages(allIndices);
    } else {
      setCollapsedMessages(new Set());
    }
  }, [selectedConversation]);

  // Phase 28: 获取角色风格提示词
  const getPersonaPrompt = useCallback(() => {
    const personas = {
      default: '',
      creative: '请用富有创意和想象力的方式回答，可以使用比喻和有趣的表达。',
      precise: '请用精确、专业、简洁的方式回答，避免冗余，直达要点。',
      friendly: '请用友好、轻松、易懂的语气回答，就像朋友之间的对话。'
    };
    return personas[aiPersona] || '';
  }, [aiPersona]);

  // Phase 28: 快速导出当前对话
  const quickExportConversation = useCallback((format: 'markdown' | 'json' | 'txt' | 'html') => {
    if (!selectedConversation) return;
    
    let content = '';
    let filename = `${selectedConversation.title || 'conversation'}_${new Date().toISOString().split('T')[0]}`;
    let mimeType = 'text/plain';
    
    switch (format) {
      case 'markdown':
        content = `# ${selectedConversation.title || 'Untitled'}\n\n`;
        content += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
        selectedConversation.messages.forEach(msg => {
          const role = msg.role === 'user' ? '👤 用户' : '🤖 AI';
          content += `## ${role}\n\n${msg.text}\n\n---\n\n`;
        });
        filename += '.md';
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify({
          title: selectedConversation.title,
          exportedAt: new Date().toISOString(),
          messages: selectedConversation.messages.map(m => ({
            role: m.role,
            content: m.text,
            timestamp: m.timestamp
          }))
        }, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
      case 'txt':
        content = `${selectedConversation.title || 'Untitled'}\n${'='.repeat(40)}\n\n`;
        selectedConversation.messages.forEach(msg => {
          const role = msg.role === 'user' ? '用户' : 'AI';
          content += `[${role}]\n${msg.text}\n\n`;
        });
        filename += '.txt';
        break;
      case 'html':
        content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedConversation.title || 'Conversation'}</title>
        <style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px}
        .msg{margin:15px 0;padding:15px;border-radius:10px}.user{background:#e3f2fd;text-align:right}
        .ai{background:#f5f5f5}.role{font-weight:bold;margin-bottom:8px}</style></head><body>
        <h1>${selectedConversation.title || 'Conversation'}</h1>`;
        selectedConversation.messages.forEach(msg => {
          const roleClass = msg.role === 'user' ? 'user' : 'ai';
          const roleName = msg.role === 'user' ? '👤 用户' : '🤖 AI';
          content += `<div class="msg ${roleClass}"><div class="role">${roleName}</div><p>${msg.text.replace(/\n/g, '<br>')}</p></div>`;
        });
        content += '</body></html>';
        filename += '.html';
        mimeType = 'text/html';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  }, [selectedConversation]);

  // Phase 29: 生成对话摘要
  const generateConversationSummary = useCallback(() => {
    if (!selectedConversation || !selectedConversation.messages || selectedConversation.messages.length === 0) {
      setConversationSummary('暂无对话内容');
      return;
    }
    
    const messages = selectedConversation.messages;
    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'model');
    
    // 提取关键话题
    const allText = messages.map(m => m.text || '').join(' ').toLowerCase();
    const topics: string[] = [];
    
    if (/代码|编程|code|program/i.test(allText)) topics.push('编程');
    if (/写作|文章|write/i.test(allText)) topics.push('写作');
    if (/翻译|translate/i.test(allText)) topics.push('翻译');
    if (/分析|analyze/i.test(allText)) topics.push('分析');
    if (/解释|explain/i.test(allText)) topics.push('解释');
    if (/设计|design/i.test(allText)) topics.push('设计');
    
    const summary = `📊 对话统计：${messages.length} 条消息
👤 用户提问：${userMessages.length} 条
🤖 AI 回复：${aiMessages.length} 条
🏷️ 话题：${topics.length > 0 ? topics.join('、') : '综合'}
⏰ 开始时间：${new Date(selectedConversation.createdAt).toLocaleString('zh-CN')}`;
    
    setConversationSummary(summary);
  }, [selectedConversation]);

  // Phase 29: 获取消息时间线数据
  const timelineData = useMemo(() => {
    if (!selectedConversation || !selectedConversation.messages) return [];
    
    return selectedConversation.messages.map((msg, idx) => ({
      index: idx,
      role: msg.role,
      time: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      preview: (msg.text || '').slice(0, 50) + ((msg.text || '').length > 50 ? '...' : ''),
      charCount: (msg.text || '').length
    }));
  }, [selectedConversation]);

  // Phase 29: 获取上下文信息
  const contextInfo = useMemo(() => {
    if (!selectedConversation || !selectedConversation.messages) return null;
    
    const messages = selectedConversation.messages;
    const totalChars = messages.reduce((acc, m) => acc + (m.text || '').length, 0);
    const estimatedTokens = Math.ceil(totalChars / 2); // 粗略估算
    const maxTokens = 128000; // 假设上下文窗口
    
    return {
      totalChars,
      estimatedTokens,
      maxTokens,
      usagePercent: Math.min(100, (estimatedTokens / maxTokens) * 100),
      messageCount: messages.length,
      avgMessageLength: messages.length > 0 ? Math.round(totalChars / messages.length) : 0
    };
  }, [selectedConversation]);

  // Phase 29: 复制代码块并记录
  const copyCodeBlock = useCallback((code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCodeBlocksCopied(prev => new Set([...prev, blockId]));
    setTimeout(() => {
      setCodeBlocksCopied(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockId);
        return newSet;
      });
    }, 2000);
  }, []);

  // Phase 30: 合并对话功能
  const mergeConversations = useCallback((targetId: string) => {
    if (!selectedConversation || targetId === selectedConversation.id) return;
    
    const targetConv = conversations.find(c => c.id === targetId);
    if (!targetConv || !targetConv.messages) return;
    
    // 合并消息
    const mergedMessages = [...(targetConv.messages || []), ...(selectedConversation.messages || [])];
    
    // 更新目标对话
    const updatedConversations = conversations.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          messages: mergedMessages,
          updatedAt: new Date().toISOString(),
          title: `${c.title} + ${selectedConversation.title || '未命名'}`
        };
      }
      return c;
    }).filter(c => c.id !== selectedConversation.id);
    
    setConversations(updatedConversations);
    setShowMergeModal(false);
    setMergeTarget(null);
    
    // 切换到合并后的对话
    const merged = updatedConversations.find(c => c.id === targetId);
    if (merged) {
      handleSelectConversation(merged);
    }
  }, [selectedConversation, conversations, handleSelectConversation]);

  // Phase 30: 搜索结果跳转
  const jumpToSearchResult = useCallback((direction: 'next' | 'prev') => {
    if (!chatSearchQuery.trim() || searchMatchCount === 0) return;
    
    const matchIndices: number[] = [];
    (selectedConversation?.messages || []).forEach((msg, idx) => {
      if (msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase())) {
        matchIndices.push(idx);
      }
    });
    
    if (matchIndices.length === 0) return;
    
    let newIndex: number;
    if (searchJumpIndex === null) {
      newIndex = direction === 'next' ? 0 : matchIndices.length - 1;
    } else {
      const currentPos = matchIndices.indexOf(searchJumpIndex);
      if (direction === 'next') {
        newIndex = currentPos >= matchIndices.length - 1 ? matchIndices[0] : matchIndices[currentPos + 1];
      } else {
        newIndex = currentPos <= 0 ? matchIndices[matchIndices.length - 1] : matchIndices[currentPos - 1];
      }
    }
    
    setSearchJumpIndex(newIndex);
    
    // 滚动到目标消息
    const element = document.querySelector(`[data-message-index="${newIndex}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [chatSearchQuery, searchMatchCount, selectedConversation, searchJumpIndex]);

  // Phase 30: 快捷键列表
  const shortcutsList = useMemo(() => [
    { key: 'Enter', description: '发送消息' },
    { key: 'Shift + Enter', description: '换行' },
    { key: 'Escape', description: '停止生成' },
    { key: '↑ (空输入框)', description: '浏览输入历史' },
    { key: 'Alt + Shift + ↑/↓', description: '消息导航' },
    { key: 'Alt + C', description: '复制聚焦消息' },
    { key: 'Cmd/Ctrl + /', description: '显示快捷键帮助' },
    { key: '/', description: '触发命令面板' },
    { key: 'Cmd/Ctrl + K', description: '搜索对话' },
    { key: 'Cmd/Ctrl + N', description: '新建对话' }
  ], []);

  // Phase 30: 响应格式提示词
  const getResponseFormatPrompt = useCallback(() => {
    const formats = {
      auto: '',
      concise: '请用简洁的方式回答，避免冗长的解释，直接给出要点。',
      detailed: '请详细解释，包含背景知识、示例和深入分析。',
      code: '请以代码为主进行回答，优先提供可运行的代码示例，注释清晰。'
    };
    return formats[responseFormat] || '';
  }, [responseFormat]);

  // Phase 31: 消息反应表情列表
  const reactionEmojis = useMemo(() => ['👍', '❤️', '😂', '🎉', '🤔', '😮', '🔥', '💯'], []);

  // Phase 31: 添加消息反应
  const addReaction = useCallback((msgIndex: number, emoji: string) => {
    setMessageReactions(prev => {
      const reactions = prev[msgIndex] || [];
      let newReactions: string[];
      if (reactions.includes(emoji)) {
        newReactions = reactions.filter(r => r !== emoji);
      } else {
        newReactions = [...reactions, emoji];
      }
      const updated = { ...prev, [msgIndex]: newReactions };
      localStorage.setItem('chatMessageReactions', JSON.stringify(updated));
      return updated;
    });
    setShowReactionPicker(null);
  }, []);

  // Phase 31: 导入对话 JSON
  const importConversation = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.title && Array.isArray(data.messages)) {
        const newConv = {
          id: Date.now().toString(),
          title: data.title + ' (导入)',
          messages: data.messages.map((m: any) => ({
            role: m.role || 'user',
            content: m.content || '',
            timestamp: m.timestamp || new Date().toISOString()
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversationId(newConv.id);
        setShowImportModal(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }, []);

  // Phase 31: 翻译消息
  const translateMessage = useCallback(async (msgIndex: number, content: string, targetLang: string = 'en') => {
    if (translatingIndex !== null) return;
    setTranslatingIndex(msgIndex);
    
    try {
      // 使用 AI 进行翻译
      const langMap: Record<string, string> = {
        'en': '英文',
        'zh': '中文',
        'ja': '日语',
        'ko': '韩语',
        'fr': '法语',
        'de': '德语'
      };
      const targetName = langMap[targetLang] || targetLang;
      const translationPrompt = `请将以下文本翻译成${targetName}，只返回翻译结果，不要其他解释：\n\n${content}`;
      
      // 模拟翻译（实际使用时可调用 AI API）
      // 这里我们用一个简单的示例
      const translation = `[${targetName}翻译] ${content.slice(0, 50)}...`;
      setTranslatedMessages(prev => ({ ...prev, [msgIndex]: translation }));
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setTranslatingIndex(null);
    }
  }, [translatingIndex]);

  // Phase 31: 智能分段处理
  const processAutoSegment = useCallback((text: string) => {
    if (!autoSegment) return text;
    
    // 根据句号、问号、感叹号分段
    const sentences = text.split(/([。！？.!?])/);
    let result = '';
    let count = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      result += sentences[i];
      if (/[。！？.!?]/.test(sentences[i])) {
        count++;
        // 每3个句子添加一个换行
        if (count % 3 === 0) {
          result += '\n\n';
        }
      }
    }
    
    return result.trim();
  }, [autoSegment]);

  // Phase 31: 保存自动分段设置
  useEffect(() => {
    localStorage.setItem('chatAutoSegment', String(autoSegment));
  }, [autoSegment]);

  // Phase 32: 克隆对话
  const cloneConversation = useCallback(() => {
    if (!selectedConversation) return;
    const cloned = {
      ...selectedConversation,
      id: Date.now().toString(),
      title: selectedConversation.title + ' (副本)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [...(selectedConversation.messages || [])]
    };
    setConversations(prev => [cloned, ...prev]);
    setCurrentConversationId(cloned.id);
  }, [selectedConversation]);

  // Phase 32: 比较两条消息
  const compareMessagesContent = useCallback((idx1: number, idx2: number) => {
    setCompareMessages([idx1, idx2]);
    setShowCompareModal(true);
  }, []);

  // Phase 32: 生成续写建议
  const generateContinuations = useCallback(() => {
    if (!chatMessages.length) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg.role !== 'model') return;
    
    // 基于最后的AI回复生成续写选项
    const suggestions = [
      '继续详细解释这个概念',
      '能给出一个实际的例子吗？',
      '这种方法有什么缺点？',
      '还有其他替代方案吗？',
      '总结一下要点'
    ];
    setContinuationSuggestions(suggestions);
    setShowContinuationPanel(true);
  }, [chatMessages]);

  // Phase 32: 消息统计数据
  const messageStatsData = useMemo(() => {
    if (!chatMessages.length) return null;
    
    const userMsgs = chatMessages.filter(m => m.role === 'user');
    const aiMsgs = chatMessages.filter(m => m.role === 'model');
    
    const userChars = userMsgs.reduce((sum, m) => sum + (m.text?.length || 0), 0);
    const aiChars = aiMsgs.reduce((sum, m) => sum + (m.text?.length || 0), 0);
    
    const avgUserLen = userMsgs.length ? Math.round(userChars / userMsgs.length) : 0;
    const avgAiLen = aiMsgs.length ? Math.round(aiChars / aiMsgs.length) : 0;
    
    // 计算代码块数量
    const codeBlockCount = aiMsgs.reduce((sum, m) => {
      const matches = m.text?.match(/```/g);
      return sum + (matches ? Math.floor(matches.length / 2) : 0);
    }, 0);
    
    // 计算问号数量（问题数）
    const questionCount = userMsgs.reduce((sum, m) => {
      const matches = m.text?.match(/[?？]/g);
      return sum + (matches ? matches.length : 0);
    }, 0);
    
    return {
      totalMessages: chatMessages.length,
      userMessages: userMsgs.length,
      aiMessages: aiMsgs.length,
      totalChars: userChars + aiChars,
      userChars,
      aiChars,
      avgUserLen,
      avgAiLen,
      codeBlockCount,
      questionCount,
      ratio: aiMsgs.length ? (userMsgs.length / aiMsgs.length).toFixed(2) : '0'
    };
  }, [chatMessages]);

  // Phase 33: 保存消息分组
  useEffect(() => {
    localStorage.setItem('chatMessageGroups', JSON.stringify(messageGroups));
  }, [messageGroups]);

  // Phase 33: 保存自动摘要设置
  useEffect(() => {
    localStorage.setItem('chatAutoSummary', String(autoSummaryEnabled));
  }, [autoSummaryEnabled]);

  // Phase 33: 添加消息到分组
  const addMessageToGroup = useCallback((groupName: string, msgIndex: number) => {
    if (!selectedConversation) return;
    const key = `${selectedConversation.id}-${groupName}`;
    setMessageGroups(prev => {
      const existing = prev[key] || [];
      if (existing.includes(msgIndex)) return prev;
      return { ...prev, [key]: [...existing, msgIndex] };
    });
  }, [selectedConversation]);

  // Phase 33: 从分组移除消息
  const removeMessageFromGroup = useCallback((groupName: string, msgIndex: number) => {
    if (!selectedConversation) return;
    const key = `${selectedConversation.id}-${groupName}`;
    setMessageGroups(prev => {
      const existing = prev[key] || [];
      return { ...prev, [key]: existing.filter(i => i !== msgIndex) };
    });
  }, [selectedConversation]);

  // Phase 33: 获取当前对话的所有分组
  const currentConversationGroups = useMemo(() => {
    if (!selectedConversation) return [];
    const prefix = `${selectedConversation.id}-`;
    return Object.keys(messageGroups)
      .filter(k => k.startsWith(prefix))
      .map(k => k.replace(prefix, ''));
  }, [selectedConversation, messageGroups]);

  // Phase 33: 快速重命名对话
  const handleQuickRename = useCallback(async (convId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    // 更新本地状态
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c
    ));
    setQuickRenameId(null);
    setQuickRenameValue('');
    // 保存到后端
    try {
      await api.renameAIConversation(convId, newTitle.trim());
    } catch (error) {
      console.error('保存标题失败:', error);
    }
  }, []);

  // Phase 33: 快捷操作列表
  const quickActionsList = useMemo(() => [
    { icon: 'add', label: '新对话', action: () => handleNewChat() },
    { icon: 'content_copy', label: '克隆对话', action: cloneConversation },
    { icon: 'download', label: '导出对话', action: () => setShowExportOptions(!showExportOptions) },
    { icon: 'upload_file', label: '导入对话', action: () => setShowImportModal(true) },
    { icon: 'merge', label: '合并对话', action: () => setShowMergeModal(true) },
    { icon: 'summarize', label: '生成摘要', action: () => {
      if (chatMessages.length > 0) {
        const summary = chatMessages.slice(0, 5).map(m => `${m.role === 'user' ? '📝' : '🤖'} ${m.text.slice(0, 50)}...`).join('\n');
        alert(`对话摘要:\n\n${summary}`);
      }
    }},
    { icon: 'bar_chart', label: '消息统计', action: () => setShowMessageStats(true) },
    { icon: 'delete', label: '清空消息', action: () => setChatMessages([]) }
  ], [cloneConversation, showExportOptions, chatMessages, handleNewChat]);

  // Phase 34: 保存星标对话
  useEffect(() => {
    localStorage.setItem('chatStarredConversations', JSON.stringify([...starredConversations]));
  }, [starredConversations]);

  // Phase 34: 保存输入模板
  useEffect(() => {
    localStorage.setItem('chatInputTemplates', JSON.stringify(inputTemplates));
  }, [inputTemplates]);

  // Phase 34: 切换消息高亮
  const toggleMessageHighlight = useCallback((msgIndex: number) => {
    setUserHighlightedMsgs(prev => {
      const next = new Set(prev);
      if (next.has(msgIndex)) {
        next.delete(msgIndex);
      } else {
        next.add(msgIndex);
      }
      return next;
    });
  }, []);

  // Phase 34: 切换对话星标
  const toggleConversationStar = useCallback((convId: string) => {
    setStarredConversations(prev => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  }, []);

  // Phase 34: 应用输入模板
  const applyInputTemplate = useCallback((template: { content: string }) => {
    setInputText(template.content);
    setShowTemplatesPanel(false);
    textareaRef.current?.focus();
  }, []);

  // Phase 34: 添加消息到引用链
  const addToReferenceChain = useCallback((msgIndex: number) => {
    setMessageReferenceChain(prev => {
      if (prev.includes(msgIndex)) return prev;
      return [...prev, msgIndex];
    });
  }, []);

  // Phase 34: 清空引用链
  const clearReferenceChain = useCallback(() => {
    setMessageReferenceChain([]);
  }, []);

  // Phase 34: 获取星标对话列表
  const starredConversationsList = useMemo(() => {
    return conversations.filter(c => starredConversations.has(c.id));
  }, [conversations, starredConversations]);

  // 获取所有唯一标签
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(conversationTags).forEach(tagList => {
      tagList.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [conversationTags]);

  // 智能标签推荐 - 基于对话内容关键词匹配
  const generateTagSuggestions = useCallback((conversationId: string, title: string, firstMessage?: string) => {
    const text = `${title} ${firstMessage || ''}`.toLowerCase();
    const suggestions: string[] = [];
    
    // 编程相关
    if (/代码|编程|程序|code|coding|python|javascript|java|react|vue|函数|function|bug|调试|debug/i.test(text)) {
      suggestions.push('编程');
    }
    // 写作相关
    if (/写作|文章|作文|文案|内容|copywriting|writing|博客|blog/i.test(text)) {
      suggestions.push('写作');
    }
    // 翻译相关
    if (/翻译|translate|英文|中文|日语|韩语|法语/i.test(text)) {
      suggestions.push('翻译');
    }
    // 学习相关
    if (/学习|教程|教学|课程|知识|learn|study|tutorial/i.test(text)) {
      suggestions.push('学习');
    }
    // 工作相关
    if (/工作|项目|任务|报告|会议|邮件|工单|work|project|task/i.test(text)) {
      suggestions.push('工作');
    }
    // 创意相关
    if (/创意|设计|点子|idea|灵感|头脑风暴|brainstorm|创作/i.test(text)) {
      suggestions.push('创意');
    }
    // 分析相关
    if (/分析|数据|统计|报表|图表|analysis|data|chart/i.test(text)) {
      suggestions.push('分析');
    }
    // 问答相关
    if (/什么是|如何|怎么|为什么|解释|what|how|why|explain/i.test(text)) {
      suggestions.push('问答');
    }
    
    // 过滤掉已有的标签
    const existingTags = conversationTags[conversationId] || [];
    const filteredSuggestions = suggestions.filter(s => !existingTags.includes(s));
    
    if (filteredSuggestions.length > 0) {
      setSuggestedTags(prev => ({ ...prev, [conversationId]: filteredSuggestions }));
    }
  }, [conversationTags]);

  // 加载模型使用历史
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ai-model-usage-history');
      if (savedHistory) {
        setModelUsageHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to load model usage history:', e);
    }
  }, []);

  // 记录模型使用
  const recordModelUsage = useCallback((modelId: string) => {
    setModelUsageHistory(prev => {
      const newHistory = { ...prev, [modelId]: (prev[modelId] || 0) + 1 };
      localStorage.setItem('ai-model-usage-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 获取常用模型列表（按使用次数排序）
  const frequentModels = useMemo(() => {
    return models
      .map((m: any) => ({
        ...m,
        usageCount: modelUsageHistory[m.modelId] || 0
      }))
      .filter((m: any) => m.usageCount > 0)
      .sort((a: any, b: any) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [models, modelUsageHistory]);

  // 保存模板到 localStorage
  const saveTemplates = useCallback((templates: typeof savedTemplates) => {
    setSavedTemplates(templates);
    localStorage.setItem('ai-chat-templates', JSON.stringify(templates));
  }, []);

  // 保存当前输入为模板
  const handleSaveTemplate = useCallback(() => {
    if (!inputText.trim() || !templateName.trim()) return;
    
    const newTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      prompt: inputText.trim(),
      createdAt: new Date()
    };
    
    saveTemplates([...savedTemplates, newTemplate]);
    setShowTemplateModal(false);
    setTemplateName('');
  }, [inputText, templateName, savedTemplates, saveTemplates]);

  // 删除模板
  const handleDeleteTemplate = useCallback((templateId: string) => {
    saveTemplates(savedTemplates.filter(t => t.id !== templateId));
  }, [savedTemplates, saveTemplates]);

  // 使用模板
  const handleUseTemplate = useCallback((prompt: string) => {
    setInputText(prompt);
    textareaRef.current?.focus();
  }, []);

  // URL检测正则表达式
  const urlRegex = useMemo(() => /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, []);

  // 检测输入中的URL
  useEffect(() => {
    const matches = inputText.match(urlRegex) || [];
    const uniqueUrls = [...new Set(matches)];
    setDetectedUrls(uniqueUrls);
  }, [inputText, urlRegex]);

  // 抓取URL内容
  const handleFetchUrl = useCallback(async (url: string) => {
    setFetchingUrl(url);
    try {
      // 使用 CORS 代理或后端API抓取
      // 这里使用一个简单的方法：通过后端代理
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          // 将抓取的内容附加到输入框
          setInputText(prev => {
            const contentPreview = data.content.slice(0, 2000);
            return `${prev}\n\n---\n📄 网页内容 (${url}):\n${contentPreview}${data.content.length > 2000 ? '\n...(内容已截断)' : ''}`;
          });
        }
      } else {
        // 如果后端API不可用，提示用户手动粘贴
        alert('无法自动抓取网页内容，请手动复制粘贴网页内容。');
      }
    } catch (error) {
      console.error('Failed to fetch URL:', error);
      // 备选方案：构建一个请求AI总结URL的提示
      setInputText(prev => `${prev}\n\n请帮我分析这个网页的内容：${url}`);
    } finally {
      setFetchingUrl(null);
    }
  }, []);

  // 监听自动发送事件
  useEffect(() => {
    const handleAutoSend = (e: CustomEvent) => {
      if (e.detail?.text) {
        handleSendMessage();
      }
    };
    window.addEventListener('ai-chat-send', handleAutoSend as EventListener);
    return () => window.removeEventListener('ai-chat-send', handleAutoSend as EventListener);
  }, [handleSendMessage]);

  const handleVoiceInput = useCallback(() => {
    if (!voiceSupported || !recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
      }
    }
  }, [voiceSupported, isListening]);

  const handleRenameConversation = (conversationId: string) => {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
      );
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        console.log('[AIDashboard] Deleting conversation:', conversationId);
        const response = await api.deleteAIConversation(conversationId) as any;
        console.log('[AIDashboard] Delete conversation API response:', response);
        
        if (!response.success) {
          throw new Error(response?.message || 'Failed to delete conversation from server');
        }
        
        // Remove from IndexedDB cache to ensure sync consistency
        await indexedDB.removeConversation(conversationId);
        console.log('[AIDashboard] Conversation removed from IndexedDB');
        
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setChatMessages([]);
        }
        console.log('[AIDashboard] Local state updated');
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'Models':
        return (
          <ModelsTab
            models={models}
            loadingProviders={loadingProviders}
            onAddModel={() => {
              setEditingModel(null);
              setShowModelForm(true);
            }}
            onEditModel={(model) => {
              setEditingModel(model);
              setShowModelForm(true);
            }}
            onDeleteModel={handleDeleteModel}
          />
        );
      case 'Assistants':
        return (
          <AssistantsTab
            assistants={assistants}
            onAddAssistant={() => {
              setEditingAssistant(null);
              setShowAssistantForm(true);
            }}
            onEditAssistant={(assistant) => {
              setEditingAssistant(assistant);
              setShowAssistantForm(true);
            }}
            onDeleteAssistant={handleDeleteAssistant}
            onSetDefaultAssistant={handleSetDefaultAssistant}
            onSelectAssistant={handleSelectAssistant}
          />
        );
      case 'Chat':
      default:
        return (
          <div
            className="flex-1 flex flex-col relative overflow-hidden min-h-0"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 拖拽上传遮罩 */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-3xl m-4 flex items-center justify-center animate-in fade-in duration-200">
                <div className="text-center">
                  <div className="size-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-5xl text-primary">upload_file</span>
                  </div>
                  <p className="text-lg font-bold text-primary">拖放文件到这里</p>
                  <p className="text-sm text-gray-500 mt-1">支持 PDF、图片、文本文件</p>
                </div>
              </div>
            )}

            {/* 消息列表区域 */}
            <main 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scrollbar-hide w-full animate-in fade-in duration-300"
            >
              {/* 对话统计信息栏 */}
              <ChatStatsBar
                chatStats={chatStats}
                bookmarkCount={bookmarkCount}
                showBookmarkedOnly={showBookmarkedOnly}
                chatMessages={chatMessages}
                isGenerating={isGenerating}
                generationSpeed={generationSpeed}
                estimatedConversationCost={estimatedConversationCost}
                autoDraftSaved={autoDraftSaved}
                showChatSearch={showChatSearch}
                chatSearchQuery={chatSearchQuery}
                searchMatchCount={searchMatchCount}
                showExportOptions={showExportOptions}
                toolbarCollapsed={toolbarCollapsed}
                compactMessageMode={compactMessageMode}
                isMultiSelectMode={isMultiSelectMode}
                bubbleTheme={bubbleTheme}
                bubbleThemes={bubbleThemes}
                searchInputRef={searchInputRef}
                onSearchChange={setChatSearchQuery}
                onSearchClose={() => { setShowChatSearch(false); setChatSearchQuery(''); }}
                onSearchOpen={() => setShowChatSearch(true)}
                onToggleBookmarkFilter={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                onToggleExportOptions={() => setShowExportOptions(!showExportOptions)}
                onExportMarkdown={() => exportAsDocument('markdown')}
                onExportJSON={() => exportAsCode('json')}
                onExportHTML={() => exportAsDocument('html')}
                onToggleToolbar={() => setToolbarCollapsed(!toolbarCollapsed)}
                onToggleCompactMode={() => { toggleCompactMode(); setToolbarCollapsed(false); }}
                onShowShortcutsHelp={() => { setShowShortcutsHelp(true); setToolbarCollapsed(false); }}
                onShowConversationStats={() => { setShowConversationStats(true); setToolbarCollapsed(false); }}
                onToggleMultiSelect={() => { 
                  setIsMultiSelectMode(!isMultiSelectMode); 
                  if (isMultiSelectMode) setSelectedMessages(new Set());
                  setToolbarCollapsed(false);
                }}
                onChangeBubbleTheme={() => {
                  const themes = ['default', 'minimal', 'gradient', 'glass'] as const;
                  const currentIdx = themes.indexOf(bubbleTheme);
                  const nextTheme = themes[(currentIdx + 1) % themes.length];
                  setBubbleTheme(nextTheme);
                  setToolbarCollapsed(false);
                }}
                onShowCostEstimate={() => setShowCostEstimate(!showCostEstimate)}
              />

              <div className="max-w-4xl mx-auto space-y-8 pb-4">
                {chatMessages.length === 0 ? (
                  <ChatEmptyStates 
                    type="welcome" 
                    onQuickAction={setInputText}
                  />
                ) : chatSearchQuery && filteredMessages.length === 0 ? (
                  <ChatEmptyStates 
                    type="no-search-results" 
                    onClearSearch={() => setChatSearchQuery('')}
                  />
                ) : showBookmarkedOnly && filteredMessages.length === 0 ? (
                  <ChatEmptyStates 
                    type="no-bookmarks" 
                    onShowAllMessages={() => setShowBookmarkedOnly(false)}
                  />
                ) : (
                  // 消息列表（使用过滤后的消息）
                  filteredMessages.map((msg, idx) => {
                    // 获取原始索引（用于编辑功能）
                    const originalIndex = chatMessages.findIndex(m => m === msg);
                    const messageId = msg.id || `msg-${originalIndex}`;
                    
                    return (
                      <div 
                        key={originalIndex} 
                        data-message-index={originalIndex}
                        draggable={!isMultiSelectMode}
                        onDragStart={(e) => handleMessageDragStart(e, messageId)}
                        onDragOver={(e) => handleMessageDragOver(e, messageId)}
                        onDragLeave={handleMessageDragLeave}
                        onDrop={(e) => handleMessageDrop(e, messageId)}
                        onDragEnd={handleMessageDragEnd}
                        className={`transition-all duration-300 ${
                          isMultiSelectMode ? 'flex items-start gap-2' : ''
                        } ${selectedMessages.has(originalIndex) ? 'bg-cyan-50 dark:bg-cyan-900/20 rounded-xl' : ''} ${
                          draggedMessageId === messageId ? 'opacity-50 scale-95' : ''
                        } ${dragOverMessageId === messageId ? 'border-t-2 border-primary' : ''} ${
                          !isMultiSelectMode ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${userHighlightedMsgs.has(originalIndex) ? 'ring-2 ring-yellow-400 ring-offset-2 rounded-xl' : ''}`}
                      >
                        {/* Phase 14: 多选复选框 */}
                        {isMultiSelectMode && (
                          <button
                            onClick={() => toggleMessageSelection(originalIndex)}
                            className={`mt-4 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                              selectedMessages.has(originalIndex)
                                ? 'bg-cyan-500 border-cyan-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400'
                            }`}
                          >
                            {selectedMessages.has(originalIndex) && (
                              <span className="material-symbols-outlined text-xs">check</span>
                            )}
                          </button>
                        )}
                        {/* Phase 17: 分支创建按钮 */}
                        {!isMultiSelectMode && msg.role === 'model' && (
                          <button
                            onClick={() => createBranchFromMessage(originalIndex)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-green-500 transition-all"
                            title="从此处创建分支"
                          >
                            <span className="material-symbols-outlined text-sm">fork_right</span>
                          </button>
                        )}
                        <div className="flex-1 min-w-0 group relative">
                          {/* Phase 17: 分支指示器 */}
                          {!isMultiSelectMode && (
                            <div className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => createBranchFromMessage(originalIndex)}
                                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-green-400 transition-all"
                                title="从此消息创建分支"
                              >
                                <span className="material-symbols-outlined text-sm text-green-500">fork_right</span>
                              </button>
                            </div>
                          )}
                          {/* Phase 28: 折叠状态显示 */}
                          {collapsedMessages.has(originalIndex) && msg.role === 'model' ? (
                            <div 
                              onClick={() => toggleMessageCollapse(originalIndex)}
                              className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-gray-400">expand_content</span>
                              <span className="text-sm text-gray-500">AI 回复已折叠</span>
                              <span className="text-xs text-gray-400 ml-2">({msg.text?.length || 0} 字符)</span>
                              <span className="material-symbols-outlined text-sm text-gray-400 ml-auto">expand_more</span>
                            </div>
                          ) : (
                            <AIChatMessage
                              role={msg.role as 'user' | 'model'}
                              text={msg.text}
                              timestamp={msg.timestamp}
                              isStreaming={isGenerating && originalIndex === chatMessages.length - 1 && msg.role === 'model'}
                              suggestions={msg.suggestions}
                              onSuggestionClick={(label) => setInputText(label)}
                              onCopy={handleCopyMessage}
                              onRegenerate={msg.role === 'model' && originalIndex === chatMessages.length - 1 ? handleRegenerateResponse : undefined}
                              onEdit={msg.role === 'user' ? (newText) => handleEditMessage(originalIndex, newText) : undefined}
                              onFork={() => handleForkConversation(originalIndex)}
                              isBookmarked={msg.isBookmarked}
                              onToggleBookmark={() => handleToggleBookmark(originalIndex)}
                              onQuoteReply={msg.role === 'model' ? handleQuoteReply : undefined}
                              rating={msg.rating}
                              onRate={msg.role === 'model' ? (r) => handleRateMessage(originalIndex, r) : undefined}
                              isPinned={msg.isPinned}
                              onTogglePin={msg.role === 'model' ? () => handleTogglePin(originalIndex) : undefined}
                              onTranslate={msg.role === 'model' ? (lang) => handleTranslateMessage(originalIndex, lang) : undefined}
                              responseTime={msg.responseTime}
                              tokenCount={msg.tokenCount}
                              messageIndex={originalIndex}
                              onDelete={() => handleDeleteMessage(originalIndex)}
                              onSpeak={msg.role === 'model' ? () => handleSpeakMessage(msg.text, originalIndex) : undefined}
                              isSpeaking={isSpeaking && speakingMessageIndex === originalIndex}
                              codeTheme={codeTheme}
                            />
                          )}

                          {/* Phase 31: 显示消息反应 */}
                          {(messageReactions[originalIndex]?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {messageReactions[originalIndex].map((emoji, i) => (
                                <span
                                  key={i}
                                  onClick={() => addReaction(originalIndex, emoji)}
                                  className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-full text-sm cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                >
                                  {emoji}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Phase 31: 显示翻译结果 */}
                          {translatedMessages[originalIndex] && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                                <span className="material-symbols-outlined text-xs">translate</span>
                                翻译结果
                                <button
                                  onClick={() => setTranslatedMessages(prev => {
                                    const { [originalIndex]: _, ...rest } = prev;
                                    return rest;
                                  })}
                                  className="ml-auto p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                                >
                                  <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{translatedMessages[originalIndex]}</p>
                            </div>
                          )}

                          {/* Phase 26: 消息反馈按钮 */}
                          {msg.role === 'model' && !isMultiSelectMode && (
                            <MessageActions
                              messageIndex={originalIndex}
                              isFocused={focusedMessageIndex === originalIndex}
                              collapsedMessages={collapsedMessages}
                              messageFeedback={messageFeedback}
                              messageReactions={messageReactions}
                              translatedMessages={translatedMessages}
                              translatingIndex={translatingIndex}
                              userHighlightedMsgs={userHighlightedMsgs}
                              messageReferenceChain={messageReferenceChain}
                              showReactionPicker={showReactionPicker}
                              reactionEmojis={reactionEmojis}
                              onSetFeedback={setMessageFeedbackFn}
                              onToggleCollapse={toggleMessageCollapse}
                              onToggleReactionPicker={setShowReactionPicker}
                              onAddReaction={addReaction}
                              onTranslate={translateMessage}
                              onToggleHighlight={toggleMessageHighlight}
                              onAddToReferenceChain={addToReferenceChain}
                              messageText={msg.text}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {/* 滚动锚点 */}
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* 滚动到底部按钮 - 优化显示逻辑 */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 right-6 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all animate-in fade-in slide-in-from-bottom-2 z-10"
                title="滚动到底部"
              >
                <span className="material-symbols-outlined text-primary">keyboard_arrow_down</span>
              </button>
            )}

            {/* 消息时间线导航 */}
            <MessageTimeline
              messageCount={chatMessages.length}
              showTimeline={showTimeline}
              timelinePosition={timelinePosition}
              timelineMarkers={timelineMarkers}
              onToggleTimeline={() => setShowTimeline(!showTimeline)}
              onNavigate={handleTimelineNavigation}
            />

            {/* Phase 14: 多选操作工具栏 */}
            <MultiSelectToolbar
              isVisible={isMultiSelectMode}
              selectedCount={selectedMessages.size}
              totalCount={chatMessages.length}
              onBulkBookmark={handleBulkBookmark}
              onBulkExport={handleBulkExport}
              onBulkDelete={handleBulkDelete}
              onSelectAll={() => {
                if (selectedMessages.size === chatMessages.length) {
                  setSelectedMessages(new Set());
                } else {
                  setSelectedMessages(new Set(chatMessages.map((_, i) => i)));
                }
              }}
              onExitMultiSelect={() => {
                setIsMultiSelectMode(false);
                setSelectedMessages(new Set());
              }}
            />

            {/* Input Bar - 增强版 - 固定在底部 */}
            <div className="flex-shrink-0 px-2 pt-0.5 pb-0 w-full border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
              <div className="max-w-4xl mx-auto">
                {/* 顶部工具栏：模型信息 + 对话操作 */}
                <InputHeaderToolbar
                  currentModelLabel={currentModelLabel}
                  currentModelId={currentConversationMeta?.model}
                  models={models}
                  frequentModels={frequentModels}
                  modelUsageHistory={modelUsageHistory}
                  onSelectModel={(model) => {
                    setCurrentConversationMeta(prev => ({
                      ...prev,
                      provider: model.provider,
                      model: model.modelId
                    }));
                  }}
                  onViewAllModels={() => setActiveTab('Models')}
                  currentAssistantLabel={currentAssistantLabel}
                  onSwitchAssistant={() => setActiveTab('Assistants')}
                  savedTemplates={savedTemplates}
                  onUseTemplate={handleUseTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  hasMessages={chatMessages.length > 0}
                  showExportMenu={showExportMenu}
                  onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
                  onExport={handleExportConversation}
                  onClearConversation={handleClearConversation}
                  selectedTone={selectedTone}
                  showToneMenu={showToneMenu}
                  onToggleToneMenu={() => setShowToneMenu(!showToneMenu)}
                  onSelectTone={(tone) => {
                    setSelectedTone(tone);
                    setShowToneMenu(false);
                  }}
                  onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
                />

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-1 shadow-lg shadow-gray-200/20 dark:shadow-none transition-all focus-within:shadow-xl focus-within:border-primary/30">
                  {/* Phase 14: 可自定义快捷回复 - 当输入为空时显示 */}
                  <QuickRepliesManager
                    showInputEmpty={!inputText}
                    isGenerating={isGenerating}
                    hasMessages={chatMessages.length > 0}
                    quickReplies={quickReplies}
                    showQuickRepliesPanel={showQuickReplies}
                    onQuickReply={handleQuickReply}
                    onRemoveReply={removeQuickReply}
                    onAddReply={addQuickReply}
                    onTogglePanel={() => setShowQuickReplies(!showQuickReplies)}
                  />

                  {/* 引用回复预览 */}
                  <ReplyQuotePreview
                    replyingToMessage={replyingToMessage}
                    onCancelQuote={handleCancelQuote}
                  />

                  {/* URL检测提示 */}
                  <UrlDetector
                    detectedUrls={detectedUrls}
                    fetchingUrl={fetchingUrl}
                    onFetchUrl={handleFetchUrl}
                  />

                  {/* Phase 21: 自动标题建议 */}
                  <TitleSuggestion
                    generatedTitle={generatedTitle}
                    isGenerating={isGenerating}
                    hasConversation={!!selectedConversation}
                    onApply={async () => {
                      if (selectedConversation && generatedTitle) {
                        // 更新本地状态
                        setConversations(prev => prev.map(c => 
                          c.id === selectedConversation.id 
                            ? { ...c, title: generatedTitle }
                            : c
                        ));
                        // 保存到后端
                        try {
                          await api.renameAIConversation(selectedConversation.id, generatedTitle);
                        } catch (error) {
                          console.error('保存标题失败:', error);
                        }
                        // 标记该对话已关闭标题建议
                        setDismissedTitleConversations(prev => new Set([...prev, selectedConversation.id]));
                      }
                      setGeneratedTitle(null);
                    }}
                    onDismiss={() => {
                      if (selectedConversation) {
                        setDismissedTitleConversations(prev => new Set([...prev, selectedConversation.id]));
                      }
                      setGeneratedTitle(null);
                    }}
                  />

                  {/* Phase 18: 响应超时提醒 */}
                  <ResponseTimeoutAlert
                    showTimeout={responseTimeout}
                    isGenerating={isGenerating}
                    onStop={handleStopGeneration}
                  />

                  {/* Phase 22: 对话统计面板 */}
                  <ConversationStatsPanel
                    show={showConversationStats}
                    stats={phase22Stats}
                    onClose={() => setShowConversationStats(false)}
                  />

                  {/* Phase 22: 斜杠命令面板 */}
                  <SlashCommandPanel
                    show={slashCommandMode}
                    commands={filteredSlashCommands}
                    onSelectCommand={(cmd) => {
                      cmd.action();
                      setSlashCommandMode(false);
                      setInputText('');
                    }}
                  />

                  {/* 文本输入区 */}
                  <div className="relative">
                    {/* Phase 26: 快捷短语面板 */}
                    <QuickPhrasesPanel
                      show={showQuickPhrases}
                      phrases={quickPhrases}
                      onSelectPhrase={insertQuickPhrase}
                      onClose={() => setShowQuickPhrases(false)}
                    />
                    <textarea
                      ref={textareaRef}
                    rows={compactMessageMode ? 1 : 2}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none p-1 text-sm leading-relaxed"
                    placeholder="输入您的问题... (Enter 发送, Esc 停止)"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      // Enter 发送消息
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addToInputHistory(inputText);
                        handleSendMessage();
                      }
                      // Escape 停止生成
                      if (e.key === 'Escape' && isGenerating) {
                        e.preventDefault();
                        handleStopGeneration();
                      }
                      // Ctrl/Cmd + Enter 也发送
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        addToInputHistory(inputText);
                        handleSendMessage();
                      }
                      // Phase 27: 上下键浏览历史
                      if (e.key === 'ArrowUp' && !inputText.trim()) {
                        e.preventDefault();
                        navigateInputHistory('up');
                      }
                      if (e.key === 'ArrowDown' && historyIndex >= 0) {
                        e.preventDefault();
                        navigateInputHistory('down');
                      }
                    }}
                    disabled={isGenerating}
                  />
                    {/* Phase 27: 智能建议 */}
                    <SmartSuggestionsPanel
                      suggestions={smartSuggestions}
                      onSelectSuggestion={setInputText}
                      onClear={() => setSmartSuggestions([])}
                    />
                    {/* Phase 27: 输入统计 */}
                    <InputStatsDisplay
                      show={showInputStats}
                      inputLength={inputText.length}
                      stats={inputStats}
                    />
                  </div>

                  {/* Phase 20: 提问优化建议 */}
                  <PromptOptimizationTip
                    tip={promptOptimizationTip}
                    isGenerating={isGenerating}
                    onDismiss={() => setPromptOptimizationTip(null)}
                  />

                  {/* 工具栏 - 精简版 */}
                  <InputToolbar
                    onFileUpload={handleFileUpload}
                    onImageUpload={handleImageUpload}
                    voiceSupported={voiceSupported}
                    isListening={isListening}
                    onVoiceInput={handleVoiceInput}
                    showQuickActions={showQuickActions}
                    hasConversation={!!selectedConversation}
                    hasMessages={chatMessages.length > 0}
                    lastMessageIsModel={chatMessages.length > 0 && chatMessages[chatMessages.length - 1]?.role === 'model'}
                    onToggleQuickActions={() => setShowQuickActions(!showQuickActions)}
                    onShowQuickPhrases={() => { setShowQuickPhrases(true); setShowQuickActions(false); }}
                    onShowTemplates={() => { setShowTemplatesPanel(true); setShowQuickActions(false); }}
                    onGenerateSummary={() => { generateConversationSummary(); setShowSummary(true); setShowQuickActions(false); }}
                    onGenerateContinuations={() => { generateContinuations(); setShowQuickActions(false); }}
                    onShowShortcuts={() => { setShowShortcutsPanel(true); setShowQuickActions(false); }}
                    referenceChainLength={messageReferenceChain.length}
                    onClearReferenceChain={clearReferenceChain}
                    inputHistoryLength={inputHistory.length}
                    inputLength={inputText.length}
                    maxInputLength={4000}
                    isGenerating={isGenerating}
                    sendDisabled={!inputText.trim() && processedFiles.length === 0}
                    onSend={handleSendMessage}
                    onStop={handleStopGeneration}
                  />

                  {/* 视觉模型警告 - 当上传图片但模型不支持视觉时显示 */}
                  {(processedFiles.some(f => f.type.startsWith('image/')) ||
                    processedFiles.some(f => f.type === 'application/pdf' && (f as any).images?.length)) && 
                   !isVisionCapableModel(currentConversationMeta?.model, models) && (
                    <div className="mt-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>当前模型 <strong>{currentConversationMeta?.model || '未选择'}</strong> 可能不支持图像识别。建议使用支持视觉的模型（如 GPT-4o、Gemini 1.5、Claude 3、Qwen2.5 VL 等）。</span>
                      </div>
                    </div>
                  )}

                  {/* 附件预览区 - 增强版 */}
                  <AttachmentPreview
                    attachments={attachments}
                    processedFiles={processedFiles}
                    processingFiles={processingFiles}
                    onRemove={removeAttachment}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSize}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* 模型表单 */}
      {showModelForm && (
        <ModelForm
          model={editingModel}
          onSave={handleSaveModel}
          onClose={() => {
            setShowModelForm(false);
            setEditingModel(null);
          }}
        />
      )}

      {/* 助手表单 */}
      {showAssistantForm && (
        <AssistantForm
          assistant={editingAssistant}
          onSave={handleSaveAssistant}
          onClose={() => {
            setShowAssistantForm(false);
            setEditingAssistant(null);
          }}
        />
      )}

      <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#0c1419] h-full w-full">
        {/* Left History Sidebar - Only visible in Chat mode */}
      {activeTab === 'Chat' && (
        <ConversationSidebar
          conversations={filteredConversations}
          loadingConversations={loadingConversations}
          currentConversationId={currentConversationId}
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortOrder={sortOrder}
          quickRenameId={quickRenameId}
          quickRenameValue={quickRenameValue}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onSortOrderChange={setSortOrder}
          onQuickRename={handleQuickRename}
          onQuickRenameStart={(id, name) => { setQuickRenameId(id); setQuickRenameValue(name); }}
          onQuickRenameCancel={() => { setQuickRenameId(null); setQuickRenameValue(''); }}
          onQuickRenameValueChange={setQuickRenameValue}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <DashboardHeader 
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {renderContent()}
        </div>
      </div>
      </div>

      {/* 保存模板模态框 */}
      <SaveTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        inputText={inputText}
        onSave={handleSaveTemplate}
      />

      {/* 快捷键帮助面板 */}
      <KeyboardHelpModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* 对话分析面板 */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        chatStats={chatStats}
      />

      {/* 快捷键帮助弹窗 */}
      {/* 快捷键帮助弹窗 */}
      <ShortcutsHelpModal
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* 费用估算弹窗 */}
      <CostEstimateModal
        isOpen={showCostEstimate}
        onClose={() => setShowCostEstimate(false)}
        costEstimate={estimatedConversationCost}
      />

      {/* Phase 17: 快照管理面板 */}
      <SnapshotsPanel
        isOpen={showSnapshotsPanel}
        onClose={() => setShowSnapshotsPanel(false)}
        snapshots={conversationSnapshots}
        onCreateSnapshot={saveConversationSnapshot}
        onRestoreSnapshot={restoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
      />

      {/* Phase 18: 记忆摘要弹窗 */}
      <MemorySummaryModal
        isOpen={showMemorySummary}
        onClose={() => setShowMemorySummary(false)}
        memorySummary={conversationMemorySummary}
      />

      {/* Phase 19: 模型信息卡片弹窗 */}
      <ModelInfoModal
        isOpen={showModelInfo}
        onClose={() => setShowModelInfo(false)}
        modelInfo={currentModelInfo}
        modelName={selectedModel}
        conversationStats={{
          messageCount: chatMessages.length,
          totalTokens: estimatedConversationCost.totalTokens,
          costUSD: estimatedConversationCost.costUSD
        }}
      />

      {/* Phase 20: 活跃度热力图弹窗 */}
      <ActivityHeatmapModal
        isOpen={showActivityHeatmap}
        onClose={() => setShowActivityHeatmap(false)}
        activityData={activityHeatmapData}
        totalConversations={conversations.length}
      />

      {/* Phase 20: 快速助手切换器弹窗 */}
      <AssistantSwitcherModal<AIAssistant>
        isOpen={showAssistantSwitcher}
        onClose={() => setShowAssistantSwitcher(false)}
        assistants={assistants}
        currentAssistant={currentAssistant}
        favoriteAssistants={favoriteAssistants}
        onSelectAssistant={(assistant) => setCurrentAssistant(assistant)}
        onToggleFavorite={toggleFavoriteAssistant}
      />

      {/* Phase 25: 模板选择器模态框 */}
      <TemplatePickerModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={phase25Templates}
        onSelectTemplate={createFromPhase25Template}
      />

      {/* Phase 29: 摘要面板 */}
      <SummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        summary={conversationSummary}
      />

      {/* Phase 29: 上下文预览面板 */}
      <ContextPreviewModal
        isOpen={showContextPreview}
        onClose={() => setShowContextPreview(false)}
        contextInfo={contextInfo}
      />

      {/* Phase 30: 快捷键面板 */}
      <ShortcutsModal
        isOpen={showShortcutsPanel}
        onClose={() => setShowShortcutsPanel(false)}
        shortcuts={shortcutsList}
      />

      {/* Phase 30: 合并对话弹窗 */}
      <MergeModal
        isOpen={showMergeModal}
        onClose={() => { setShowMergeModal(false); setMergeTarget(null); }}
        currentConversation={selectedConversation}
        conversations={conversations}
        mergeTarget={mergeTarget}
        onSelectTarget={setMergeTarget}
        onMerge={mergeConversations}
      />

      {/* Phase 31: 导入对话弹窗 */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importConversation}
      />

      {/* Phase 32: 消息统计面板 */}
      <MessageStatsModal
        isOpen={showMessageStats}
        onClose={() => setShowMessageStats(false)}
        stats={messageStatsData}
      />

      {/* Phase 32: 智能续写面板 */}
      <ContinuationPanel
        isOpen={showContinuationPanel}
        onClose={() => setShowContinuationPanel(false)}
        suggestions={continuationSuggestions}
        onSelectSuggestion={(suggestion) => {
          setInputText(suggestion);
          setShowContinuationPanel(false);
          textareaRef.current?.focus();
        }}
      />

      {/* Phase 32: 消息比对弹窗 */}
      <CompareModal
        isOpen={showCompareModal}
        onClose={() => { setShowCompareModal(false); setCompareMessages(null); }}
        compareMessages={compareMessages}
        messages={chatMessages}
      />

      {/* Phase 33: 消息分组管理弹窗 */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        selectedConversation={selectedConversation}
        currentConversationGroups={currentConversationGroups}
        messageGroups={messageGroups}
        onCreateGroup={(groupName) => {
          if (selectedConversation) {
            const key = `${selectedConversation.id}-${groupName}`;
            setMessageGroups(prev => ({ ...prev, [key]: [] }));
          }
        }}
        onDeleteGroup={(key) => {
          setMessageGroups(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        }}
      />
    </>
  );
};

export default AIDashboard;
