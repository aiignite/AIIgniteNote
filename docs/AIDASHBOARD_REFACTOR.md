# AIDashboard 重构文档

## 概述

将原本 9,343 行的单一 `AIDashboard.tsx` 文件重构为模块化的目录结构，提高代码可维护性、可测试性和可复用性。

## 目录结构

```
components/AIDashboard/
├── index.ts                    # 模块入口，统一导出
├── types.ts                    # 类型定义
├── utils.ts                    # 工具函数
├── AIDashboardRefactored.tsx   # 重构版主组件 (450 行)
├── test-exports.ts             # 导出验证测试
│
├── hooks/                      # 自定义 Hooks
│   ├── index.ts                # Hooks 导出
│   ├── useConversations.ts     # 对话管理 Hook
│   ├── useModels.ts            # 模型/助手管理 Hook
│   └── useChat.ts              # 聊天消息管理 Hook
│
└── components/                 # 子组件
    ├── index.ts                # 组件导出
    ├── MessageInput.tsx        # 消息输入框
    ├── MessageBubble.tsx       # 消息气泡
    ├── MessageList.tsx         # 消息列表
    ├── MessageActions.tsx      # 消息操作按钮
    ├── MarkdownRenderer.tsx    # Markdown 渲染器
    ├── ConversationList.tsx    # 对话列表
    ├── ModelSelector.tsx       # 模型选择器
    ├── AssistantSelector.tsx   # 助手选择器
    ├── ChatHeader.tsx          # 聊天头部
    ├── EmptyState.tsx          # 空状态展示
    ├── SettingsPanel.tsx       # 设置面板
    └── ShortcutsPanel.tsx      # 快捷键帮助
```

## 使用方式

### 1. 使用原版组件（默认，保持兼容）

```tsx
import AIDashboard from './components/AIDashboard';

function App() {
  return <AIDashboard />;
}
```

### 2. 使用重构版组件

```tsx
import { AIDashboardRefactored } from './components/AIDashboard';

function App() {
  return <AIDashboardRefactored />;
}
```

### 3. 使用版本切换包装器

```tsx
import { AIDashboardWrapper } from './components/AIDashboardEntry';

function App() {
  return (
    <AIDashboardWrapper 
      showVersionToggle={process.env.NODE_ENV === 'development'}
    />
  );
}
```

### 4. 单独使用子组件

```tsx
import { 
  MessageInput, 
  MessageList, 
  ConversationList 
} from './components/AIDashboard';

function CustomChat() {
  return (
    <div>
      <ConversationList ... />
      <MessageList ... />
      <MessageInput ... />
    </div>
  );
}
```

### 5. 单独使用 Hooks

```tsx
import { 
  useConversations, 
  useModels, 
  useChat 
} from './components/AIDashboard';

function MyComponent() {
  const { conversations, createConversation } = useConversations();
  const { models, selectModel } = useModels();
  const { messages, sendMessage } = useChat();
  
  // 自定义逻辑...
}
```

## Hooks API

### useConversations

管理对话列表、搜索、排序、标签等。

```typescript
const {
  conversations,           // 对话列表
  currentConversationId,   // 当前对话ID
  filteredConversations,   // 过滤后的列表
  searchQuery,             // 搜索关键词
  sortBy,                  // 排序方式
  setCurrentConversationId,
  deleteConversation,
  archiveConversation,
  toggleStarConversation,
  addTagToConversation,
  removeTagFromConversation,
  setSearchQuery,
  setSortBy,
} = useConversations();
```

### useModels

管理 AI 模型和助手的加载、选择、CRUD 操作。

```typescript
const {
  models,                  // 模型列表
  assistants,              // 助手列表
  currentModelId,          // 当前模型ID
  currentAssistantId,      // 当前助手ID
  currentModel,            // 当前模型对象
  currentAssistant,        // 当前助手对象
  selectModel,
  selectAssistant,
  createModel,
  updateModel,
  deleteModel,
  createAssistant,
  updateAssistant,
  deleteAssistant,
} = useModels();
```

### useChat

管理聊天消息的发送、接收、流式响应等。

```typescript
const {
  messages,                // 消息列表
  isLoading,               // 加载状态
  streaming,               // 流式状态
  bookmarkedMessages,      // 书签消息索引
  selectedMessages,        // 选中消息索引
  sendMessage,
  deleteMessage,
  editMessage,
  regenerateMessage,
  toggleBookmark,
  toggleSelection,
  clearSelection,
} = useChat();
```

## 组件 API

### MessageInput

```tsx
<MessageInput
  value={inputText}
  onChange={setInputText}
  onSend={(text) => sendMessage({ text })}
  isLoading={isLoading}
  placeholder="发送消息..."
  showVoiceInput={true}
  showSlashCommands={true}
/>
```

### MessageList

```tsx
<MessageList
  messages={messages}
  isStreaming={streaming.isStreaming}
  streamingText={streaming.currentText}
  theme="default"
  showTimestamps={true}
  showAvatars={true}
  bookmarkedIndices={[0, 2, 5]}
  onBookmark={toggleBookmark}
  onEdit={editMessage}
  onDelete={deleteMessage}
  onRegenerate={regenerateMessage}
/>
```

### ConversationList

```tsx
<ConversationList
  conversations={conversations}
  currentConversationId={currentId}
  onSelectConversation={selectConversation}
  onDeleteConversation={deleteConversation}
  onNewConversation={createConversation}
  searchQuery={query}
  onSearchChange={setQuery}
  sortMode="time"
  onSortChange={setSortMode}
/>
```

## 工具函数

```typescript
import {
  formatTimestamp,        // 格式化时间戳
  formatRelativeTime,     // 格式化相对时间
  generateConversationTitle, // 生成对话标题
  exportConversation,     // 导出对话
  downloadFile,           // 下载文件
  copyToClipboard,        // 复制到剪贴板
  searchMessages,         // 搜索消息
  debounce,               // 防抖函数
  throttle,               // 节流函数
} from './components/AIDashboard';
```

## 统计对比

| 指标 | 原版 | 重构版 | 改善 |
|------|------|--------|------|
| 主文件行数 | 9,343 | 450 | -95% |
| 文件数量 | 1 | 20 | 模块化 |
| 可复用组件 | 0 | 15 | +15 |
| 自定义 Hooks | 0 | 3 | +3 |
| 工具函数 | 内联 | 15+ | 可复用 |
| 单元测试难度 | 困难 | 容易 | ✅ |

## 新增通用组件

### MarkdownRenderer
```tsx
import { MarkdownRenderer } from './components/AIDashboard';

<MarkdownRenderer 
  content={markdownText}
  codeTheme="github" // 可选: github, monokai, dracula, nord
/>
```

### Toast 通知
```tsx
import { ToastProvider, useToast } from './components/AIDashboard';

// 包装应用
<ToastProvider position="bottom-right">
  <App />
</ToastProvider>

// 在组件中使用
const toast = useToast();
toast.success('保存成功');
toast.error('操作失败');
```

### 确认对话框
```tsx
import { ConfirmDialog, useConfirmDialog } from './components/AIDashboard';

const { confirm, dialogProps } = useConfirmDialog({
  title: '删除确认',
  message: '确定要删除这条消息吗？',
  variant: 'danger',
});

const handleDelete = async () => {
  if (await confirm()) {
    // 执行删除
  }
};

<ConfirmDialog {...dialogProps} />
```

### 虚拟滚动列表
```tsx
import { VirtualizedList } from './components/AIDashboard';

<VirtualizedList
  items={messages}
  itemHeight={80}
  renderItem={(msg, index, style) => (
    <MessageBubble key={msg.id} message={msg} style={style} />
  )}
/>
```

### 加载状态组件
```tsx
import { 
  LoadingSpinner, 
  LoadingDots, 
  MessageSkeleton,
  TypingIndicator,
} from './components/AIDashboard';

<LoadingSpinner size="lg" />
<LoadingDots />
<MessageSkeleton lines={3} />
<TypingIndicator username="AI助手" />
```

## 迁移建议

1. **渐进式迁移**: 保留原版组件，新功能使用重构版或子组件
2. **测试验证**: 在开发环境使用 `AIDashboardWrapper` 的版本切换功能测试
3. **逐步替换**: 确认功能无误后，逐步替换原版引用
4. **添加测试**: 为 Hooks 和组件添加单元测试

## 注意事项

- 重构版使用与原版相同的 API 接口
- 本地存储 key 保持一致，数据可以互通
- 某些高级功能（如消息版本历史、快照等）在重构版中简化处理
