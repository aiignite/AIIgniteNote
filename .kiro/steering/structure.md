# 项目结构和组织

## 目录结构

```
/
├── components/           # React 组件
│   ├── editors/         # 编辑器组件
│   │   ├── DrawioEditor.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── MindMapEditor.tsx
│   │   └── RichTextEditor.tsx
│   ├── AIDashboard.tsx  # AI 仪表板
│   ├── AIPanel.tsx      # AI 助手面板
│   ├── Editor.tsx       # 主编辑器
│   ├── LoginPage.tsx    # 登录页面
│   ├── NoteList.tsx     # 笔记列表
│   ├── SearchView.tsx   # 搜索视图
│   ├── Settings.tsx     # 设置页面
│   ├── Sidebar.tsx      # 侧边栏
│   ├── TemplateGallery.tsx # 模板库
│   └── UserManagement.tsx  # 用户管理
├── services/            # 服务层
│   └── gemini.ts       # Gemini AI 服务
├── store/              # 状态管理
│   ├── languageStore.ts # 语言设置
│   └── themeStore.ts   # 主题设置
├── App.tsx             # 主应用组件
├── types.ts            # TypeScript 类型定义
├── constants.ts        # 常量定义
├── index.tsx           # 应用入口
└── ai-ignite-note.sql  # 数据库架构
```

## 组件架构

### 主要组件层次
- **App.tsx**: 根组件，管理全局状态和路由
- **Sidebar**: 导航侧边栏
- **NoteList**: 笔记列表和文件夹管理
- **Editor**: 主编辑区域，根据笔记类型加载不同编辑器
- **AIPanel**: AI 助手交互面板

### 编辑器组件
- 每种笔记类型对应一个专门的编辑器组件
- 统一的接口设计，便于扩展新的编辑器类型

## 状态管理

### Zustand Stores
- **themeStore**: 主题颜色、深色模式等UI设置
- **languageStore**: 国际化语言设置

### 本地状态
- 笔记数据通过 React state 管理
- 面板宽度、拖拽状态等UI状态

## 类型系统

### 核心类型
- **Note**: 笔记实体，包含 id、title、content、type 等
- **NoteType**: 笔记类型枚举 ('Markdown' | 'Rich Text' | 'Mind Map' | 'Drawio')
- **ViewState**: 视图状态枚举
- **ChatMessage**: AI 对话消息
- **AppUser**: 用户信息

## 样式规范

- 使用 Tailwind CSS 类名
- CSS 变量用于主题色: `--color-primary`
- 响应式设计，支持面板拖拽调整
- 深色模式支持