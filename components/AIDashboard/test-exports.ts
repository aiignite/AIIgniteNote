/**
 * AIDashboard 模块测试
 * 
 * 验证所有导出是否正常工作
 */

// 测试类型导出
import type {
  AIModel,
  AIAssistant,
  AIConversation,
  ConversationSortMode,
  BubbleTheme,
  DashboardTab,
  ViewMode,
} from './index';

// 测试 Hook 导出
import {
  useConversations,
  useModels,
  useChat,
} from './hooks';

// 测试组件导出
import {
  MessageInput,
  MessageList,
  MessageBubble,
  ConversationList,
  ModelSelector,
  AssistantSelector,
  ChatHeader,
  EmptyState,
  SettingsPanel,
  ShortcutsPanel,
  useKeyboardShortcuts,
} from './components';

// 测试工具函数导出
import {
  formatTimestamp,
  formatDate,
  formatRelativeTime,
  generateConversationTitle,
  calculateMessageStats,
  exportConversation,
  downloadFile,
  copyToClipboard,
  generateId,
  debounce,
  throttle,
  searchMessages,
  filterBookmarkedMessages,
  parseSlashCommand,
  validateModelConfig,
} from './utils';

// 测试主组件导出
import { AIDashboardRefactored } from './AIDashboardRefactored';

// 导出验证函数
export function verifyExports(): boolean {
  const checks = [
    // Hooks
    typeof useConversations === 'function',
    typeof useModels === 'function',
    typeof useChat === 'function',
    
    // Components
    typeof MessageInput !== 'undefined',
    typeof MessageList !== 'undefined',
    typeof MessageBubble !== 'undefined',
    typeof ConversationList !== 'undefined',
    typeof ModelSelector !== 'undefined',
    typeof AssistantSelector !== 'undefined',
    typeof ChatHeader !== 'undefined',
    typeof EmptyState !== 'undefined',
    typeof SettingsPanel !== 'undefined',
    typeof ShortcutsPanel !== 'undefined',
    typeof useKeyboardShortcuts === 'function',
    
    // Utils
    typeof formatTimestamp === 'function',
    typeof formatDate === 'function',
    typeof formatRelativeTime === 'function',
    typeof generateConversationTitle === 'function',
    typeof calculateMessageStats === 'function',
    typeof exportConversation === 'function',
    typeof downloadFile === 'function',
    typeof copyToClipboard === 'function',
    typeof generateId === 'function',
    typeof debounce === 'function',
    typeof throttle === 'function',
    typeof searchMessages === 'function',
    typeof filterBookmarkedMessages === 'function',
    typeof parseSlashCommand === 'function',
    typeof validateModelConfig === 'function',
    
    // Main component
    typeof AIDashboardRefactored !== 'undefined',
  ];

  const allPassed = checks.every(Boolean);
  
  if (allPassed) {
    console.log('✅ All AIDashboard module exports verified successfully!');
  } else {
    console.error('❌ Some exports failed verification');
    checks.forEach((check, index) => {
      if (!check) {
        console.error(`  Failed check at index ${index}`);
      }
    });
  }

  return allPassed;
}

// 类型验证 (编译时检查)
const _typeCheck: {
  model: AIModel;
  assistant: AIAssistant;
  conversation: AIConversation;
  sortMode: ConversationSortMode;
  theme: BubbleTheme;
  tab: DashboardTab;
  viewMode: ViewMode;
} = {} as any;

export default verifyExports;
