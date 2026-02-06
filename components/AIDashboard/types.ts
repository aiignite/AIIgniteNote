/**
 * AIDashboard 类型定义
 * 包含 AI 模型、助手、对话等相关类型
 */

import { ChatMessage } from '../../types';

// AI Model 类型定义
export interface AIModel {
  id: string;
  name: string;
  displayName?: string; // 可选的显示名称
  modelId: string;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  popularity: number;
  isPublic: boolean;
  isCustom: boolean;
  isDefault?: boolean; // 是否为默认模型
  speed: string;
  cost: string;
  context: string;
  description: string;
  supportsText: boolean; // 是否支持文本处理
  supportsImage: boolean; // 是否支持图像处理
}

// AI Assistant 类型定义
export interface AIAssistant {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar: string;
  systemPrompt: string;
  category: string;
  isSystem: boolean;
  isCustom?: boolean;
  usageCount: number;
  model?: string;  // Model ID to use for this assistant
  isDefault?: boolean; // 是否为默认助手
}

// AI 对话类型定义
export interface AIConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model?: string;
  provider?: string;
  assistantId?: string;
  createdAt: string;
  updatedAt: string;
  isLocal?: boolean;
  isArchived?: boolean;
  isStarred?: boolean;   // 是否星标
  tags?: string[];       // 标签列表
  folder?: string;       // 文件夹
  priority?: 'low' | 'medium' | 'high';  // 优先级
}

// 对话排序模式
// 注意: 统一定义已在上方，此行保留以避免破坏现有引用

// 对话快照
export interface ConversationSnapshot {
  id: string;
  name: string;
  timestamp: number;
  conversationId: string;
  messages: ChatMessage[];
}

// 对话元信息
export interface ConversationMeta {
  provider?: string;
  model?: string;
}

// 斜杠命令
export interface SlashCommand {
  command: string;
  description: string;
  icon: string;
  action: () => void;
}

// 快捷操作
export interface QuickAction {
  icon: string;
  label: string;
  action: () => void;
}

// 气泡主题
export type BubbleTheme = 'default' | 'minimal' | 'gradient' | 'glass';

// 对话排序模式 (统一定义，包含所有可能的排序方式)
export type ConversationSortMode = 'time' | 'name' | 'starred' | 'messages' | 'priority';

// 代码主题
export type CodeTheme = 'github' | 'monokai' | 'dracula' | 'nord';

// 语气风格
export type ToneStyle = 'default' | 'formal' | 'casual' | 'creative' | 'concise';

// 模型信息
export interface ModelInfo {
  provider: string;
  icon: string;
  color: string;
  description: string;
}

// 对话统计
export interface ConversationStats {
  regenerateCount: number;
  editCount: number;
  avgResponseTime: number;
  longestStreak: number;
  currentStreak: number;
}

// 消息统计
export interface MessageStats {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  totalChars: number;
  avgResponseTime: number;
}

// 活动时间统计
export interface ActivityStats {
  hour: number;
  count: number;
}

// Phase 25 模板
export interface Phase25Template {
  id: string;
  name: string;
  systemPrompt: string;
  firstMessage?: string;
  icon: string;
}

// 导出格式
export type ExportFormat = 'markdown' | 'html' | 'json' | 'javascript' | 'python';

// 日期范围
export interface DateRange {
  start: string;
  end: string;
}

// 焦点区域
export type FocusArea = 'input' | 'list' | 'messages';

// Tab 类型
export type DashboardTab = 'Models' | 'Assistants' | 'Chat';

// 视图模式
export type ViewMode = 'grid' | 'list';
