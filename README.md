<div align="center">

# AI Ignite Note

### 智能 AI 笔记应用 - 多类型笔记 + AI 助手集成 + 实时协作

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-cyan)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-green)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-black)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-yellow)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[功能特性](#功能特性) • [技术栈](#技术栈) • [快速开始](#快速开始) • [Docker 部署](#docker-部署) • [API 文档](#api-文档)

</div>

---

## 📝 项目简介

**AI Ignite Note** 是一款功能强大的智能笔记应用，集成了多种 AI 助手，支持 Markdown、富文本（BlockNote）、思维导图和流程图等多种笔记类型。采用前后端分离架构，支持离线同步、实时聊天，并可通过 MCP 协议与外部 AI 客户端（Claude Desktop、Cursor 等）集成。

### 核心亮点

- 🎨 **多类型编辑器**：Markdown、BlockNote 富文本、思维导图、Drawio 流程图
- 🤖 **多 AI 提供商**：支持 Gemini、Claude、OpenAI、Ollama、LM Studio
- 💬 **实时聊天**：基于 Socket.IO 的 AI 对话，支持流式响应
- 🔄 **离线同步**：IndexedDB 本地缓存 + 自动同步
- 🌐 **MCP 集成**：通过 Model Context Protocol 对接外部 AI 客户端
- 📁 **文件管理**：上传、下载、预览多种文件格式
- 🎨 **主题定制**：支持浅色/深色主题切换

---

## ✨ 功能特性

### 📋 笔记管理

#### 支持的笔记类型

| 类型 | 编辑器 | 特性 |
|------|--------|------|
| **Markdown** | MD Editor | GFM、数学公式、代码高亮、TOC |
| **富文本** | BlockNote | 现代化 UI、斜杠命令、协作编辑 |
| **思维导图** | Simple Mind Map | 拖拽布局、多主题、导出 SVG |
| **流程图** | Drawio | Visio 兼容、丰富图库、导入导出 |

#### 笔记操作

- ✅ 创建、编辑、删除笔记
- 💾 实时自动保存
- 🏷️ 标签分类管理
- ⭐ 收藏功能
- 🗑️ 回收站（软删除/恢复）
- 🔍 全文搜索
- 📤 导出（Markdown、PDF、图片）

### 🤖 AI 助手集成

#### 支持的 AI 提供商

| 提供商 | 模型示例 | 特点 |
|--------|----------|------|
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro | 最新模型，免费额度 |
| **Anthropic Claude** | claude-sonnet-4, claude-3-5-sonnet | 高质量输出 |
| **OpenAI GPT** | gpt-4o, gpt-4o-mini | 功能全面 |
| **Ollama** | 本地模型 | 完全离线，隐私保护 |
| **LM Studio** | 本地模型 | 可自定义模型 |

#### AI 功能

- 💬 实时聊天对话（流式响应）
- 📜 对话历史持久化
- 👤 自定义 AI 助手角色
- ⚡ 快速操作指令
- 🎯 模板驱动生成
- 🔗 文件附件支持
- 🔒 对话加密存储

### 💬 实时聊天系统

- 基于 **Socket.IO** 的 WebSocket 通信
- 聊天室创建与管理
- 消息持久化到数据库
- 输入状态实时同步
- 消息已读/未读状态

### 📄 模板系统

- 预置模板库（规划、头脑风暴、写作、商业等）
- 自定义模板创建
- 模板应用生成笔记
- 公共/私有模板分类

### 📁 文件管理

- 文件上传（图片、文档等）
- 文件预览（PDF、图片）
- 下载管理
- AI 对话附件关联

### 🌐 MCP 集成

- 支持 **Claude Desktop** 集成
- 支持 **Cursor** 集成
- 支持 **VS Code GitHub Copilot** 集成
- 通过 HTTP API + JWT 认证
- 10+ MCP 工具（笔记 CRUD、搜索、文件夹管理等）

### 🔐 认证与权限

- JWT 认证机制
- Token 自动刷新
- 用户注册/登录
- 个人资料管理
- 工作空间成员权限

### 🔄 离线同步

- IndexedDB 本地存储
- 自动后台同步
- 网络状态检测
- 冲突解决机制

---

## 🛠 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6.2 | 构建工具 |
| Zustand | 4.5 | 状态管理 |
| Tailwind CSS | 4.1 | CSS 框架 |
| Material Symbols | 0.40 | 图标库 |

#### 前端编辑器

| 库 | 版本 | 用途 |
|----|------|------|
| BlockNote | 0.46 | 富文本编辑器 |
| @uiw/react-md-editor | 3.6 | Markdown 编辑器 |
| simple-mind-map | 0.11 | 思维导图 |
| Drawio | - | 流程图编辑器 |
| React Quill | 2.0 | 备用富文本编辑器 |

#### 前端其他库

| 库 | 用途 |
|----|------|
| socket.io-client | WebSocket 客户端 |
| react-markdown | Markdown 渲染 |
| highlight.js | 代码高亮 |
| kaTeX | 数学公式 |
| mermaid | 图表渲染 |
| echarts | 数据可视化 |
| html2canvas | 截图导出 |
| jspdf | PDF 导出 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | 4.21 | Web 框架 |
| TypeScript | 5.8 | 类型安全 |
| Prisma | 5.22 | ORM |
| PostgreSQL | 15+ | 数据库 |
| Socket.IO | 4.8 | 实时通信 |
| Winston | 3.17 | 日志管理 |

#### 后端 AI SDK

| 提供商 | SDK | 版本 |
|--------|-----|------|
| Google Gemini | @google/genai | 1.37.0 |
| Anthropic Claude | @anthropic-ai/sdk | 0.32.1 |
| OpenAI GPT | openai | 4.73.1 |
| Ollama | HTTP API | - |
| LM Studio | HTTP API | - |

#### 后端其他库

| 库 | 用途 |
|----|------|
| jsonwebtoken | JWT 认证 |
| bcryptjs | 密码加密 |
| multer | 文件上传 |
| zod | 数据验证 |
| helmet | 安全头 |
| express-rate-limit | 速率限制 |

### MCP Server

| 技术 | 版本 | 说明 |
|------|------|------|
| @modelcontextprotocol/sdk | 1.12 | MCP SDK |
| Node.js | 18+ | 运行时 |
| TypeScript | 5.8 | 类型安全 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+
- **PostgreSQL** 15+
- **npm** 或 **yarn**

### 方法一：推荐 - 使用启动脚本（本地开发）

```bash
# 克隆项目
git clone https://github.com/aiignite/AIIgniteNote.git
cd AIIgniteNote

# 使用启动脚本一键启动（自动安装依赖、初始化数据库、启动前后端）
bash start.sh
```

**start.sh 脚本会自动完成以下操作：**
1. 检查 Node.js 和依赖
2. 安装前端和后端依赖
3. 初始化数据库（Prisma 迁移）
4. 启动后端服务（端口 3215）
5. 启动前端服务（端口 3210）

访问 http://localhost:3210 开始使用。

### 方法二：手动安装（适合本地开发）

#### 1. 安装 PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# 下载并安装: https://www.postgresql.org/download/windows/
```

#### 2. 初始化数据库

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑 .env 文件，配置数据库连接
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ignite_note"

# 运行数据库初始化脚本
bash setup-local-db.sh

# 或者手动执行
cd backend
npm run prisma:generate
npm run prisma:migrate
```

#### 3. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

#### 4. 配置 AI 提供商（可选）

在 `backend/.env` 中配置至少一个 AI 提供商：

```bash
# Google Gemini（推荐，有免费额度）
GOOGLE_AI_API_KEY=your_gemini_api_key

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Ollama（本地）
OLLAMA_API_URL=http://localhost:11434

# LM Studio（本地）
LM_STUDIO_API_URL=http://localhost:1234
```

#### 5. 启动服务

```bash
# 终端1：启动后端（端口 3215）
cd backend
npm run dev

# 终端2：启动前端（端口 3210）
npm run dev
```

#### 6. 访问应用

- **前端地址**: http://localhost:3210
- **后端地址**: http://localhost:3215
- **API 文档**: http://localhost:3215/api

首次访问需要注册新用户账户。

### 获取 API Key

#### Google Gemini（推荐）

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建 API 密钥
3. 在 `.env` 中设置：`GOOGLE_AI_API_KEY=your_api_key`

**可用模型：**
- `gemini-2.0-flash-exp`（最新，推荐）
- `gemini-1.5-pro`
- `gemini-1.5-flash`

#### Anthropic Claude

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建 API 密钥
3. 在 `.env` 中设置：`ANTHROPIC_API_KEY=your_api_key`

**可用模型：**
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet-20241022`

#### OpenAI GPT

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 创建 API 密钥
3. 在 `.env` 中设置：`OPENAI_API_KEY=your_api_key`

**可用模型：**
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-3.5-turbo`

---

## 🐳 Docker 部署

项目支持 Docker Compose 一键部署，详见 [docker-compose.yml](./docker-compose.yml)。

### 快速启动

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑 .env 文件，添加 AI 提供商 API 密钥
nano .env

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 初始化数据库
docker-compose exec backend npx prisma migrate deploy
```

### 服务访问

- 前端: http://localhost:3210
- 后端 API: http://localhost:3215
- 健康检查: http://localhost:3215/health
- 数据库: localhost:5434

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除所有数据（包括数据库）
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build
```

---

## 🔌 MCP 集成

MCP Server 允许外部 AI 客户端（如 Claude Desktop、Cursor）直接操作笔记系统。

### MCP 功能

| 工具 | 说明 | 操作类型 |
|------|------|----------|
| `note_create` | 创建笔记 | 写入 |
| `note_read` | 读取笔记 | 只读 |
| `note_update` | 更新笔记 | 写入 |
| `note_delete` | 删除笔记 | 破坏性 |
| `note_search` | 搜索笔记 | 只读 |
| `note_toggle_favorite` | 切换收藏 | 写入 |
| `folder_list` | 列出文件夹 | 只读 |
| `folder_create` | 创建文件夹 | 写入 |
| `folder_delete` | 删除文件夹 | 破坏性 |

### 构建 MCP Server

```bash
cd backend/src/mcp
npm install
npm run build
```

### Claude Desktop 配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aiignitenote": {
      "command": "node",
      "args": ["/path/to/AIIgniteNote/backend/src/mcp/dist/index.js"],
      "env": {
        "MCP_USER_EMAIL": "your-email@example.com",
        "MCP_USER_PASSWORD": "your-password",
        "MCP_API_URL": "http://localhost:3215/api"
      }
    }
  }
}
```

详见 [backend/src/mcp/README.md](./backend/src/mcp/README.md)。

---

## 📦 项目结构

```
AIIgniteNote/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── app.ts             # 应用入口
│   │   ├── config/            # 配置文件
│   │   ├── controllers/       # 控制器
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # 路由
│   │   ├── services/          # 业务逻辑
│   │   │   ├── ai/           # AI 服务
│   │   │   │   └── providers/ # AI 提供商
│   │   │   ├── ai-assistants.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   └── notes.service.ts
│   │   ├── socket/            # Socket.IO
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── src/mcp/               # MCP Server
│   │   ├── index.ts
│   │   ├── tools/            # MCP 工具
│   │   └── services/         # API 客户端
│   ├── prisma/               # 数据库 schema
│   ├── logs/                 # 日志文件
│   ├── uploads/              # 上传文件
│   ├── .env                  # 环境变量
│   ├── package.json
│   └── tsconfig.json
│
├── components/                # React 组件
│   ├── AIPanel.tsx           # AI 助手面板
│   ├── AIDashboard.tsx       # AI 仪表板
│   ├── Editor.tsx            # 笔记编辑器
│   ├── NoteList.tsx          # 笔记列表
│   ├── Sidebar.tsx           # 侧边栏
│   ├── Settings.tsx          # 设置页面
│   ├── FileManager.tsx       # 文件管理
│   ├── TemplateGallery.tsx   # 模板库
│   ├── LoginPage.tsx         # 登录页
│   └── editors/              # 编辑器组件
│       ├── MarkdownEditor.tsx
│       ├── RichTextEditor.tsx (BlockNote)
│       ├── MindMapEditor.tsx
│       └── DrawioEditor.tsx
│
├── services/                  # 前端服务
│   ├── api.ts                # API 客户端
│   ├── indexedDB.ts          # 本地存储
│   ├── offlineSync.ts        # 离线同步
│   └── socket.ts             # Socket 客户端
│
├── store/                     # Zustand 状态管理
│   ├── languageStore.ts      # 语言设置
│   └── themeStore.ts         # 主题设置
│
├── App.tsx                    # 应用入口
├── types.ts                   # 类型定义
├── vite.config.ts            # Vite 配置
├── package.json
├── docker-compose.yml        # Docker 配置
├── start.sh                   # 启动脚本
└── README.md
```

---

## 📚 API 文档

### 认证

#### 注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "name": "用户名"
}
```

#### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### 笔记

#### 获取笔记列表

```http
GET /api/notes
Authorization: Bearer {token}
```

#### 创建笔记

```http
POST /api/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "笔记标题",
  "content": "笔记内容",
  "noteType": "MARKDOWN",
  "folderId": "folder-id",
  "tags": ["标签1", "标签2"]
}
```

#### 更新笔记

```http
PUT /api/notes/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容"
}
```

#### 删除笔记

```http
DELETE /api/notes/{id}
Authorization: Bearer {token}
```

### AI 助手

#### 获取提供商列表

```http
GET /api/ai/providers
Authorization: Bearer {token}
```

#### 发送聊天消息（流式）

```http
POST /api/ai/chat/stream
Authorization: Bearer {token}
Content-Type: text/event-stream

{
  "provider": "GOOGLE",
  "model": "gemini-2.0-flash-exp",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

#### 获取对话历史

```http
GET /api/ai/conversations
Authorization: Bearer {token}
```

### 模板

#### 获取模板列表

```http
GET /api/templates?search=关键词&category=Planning
Authorization: Bearer {token}
```

#### 创建模板

```http
POST /api/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "模板名称",
  "description": "模板描述",
  "prompt": "AI 提示词",
  "category": "Planning",
  "noteType": "MARKDOWN",
  "isPublic": true
}
```

### 文件管理

#### 上传文件

```http
POST /api/files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [文件]
```

#### 获取文件列表

```http
GET /api/files
Authorization: Bearer {token}
```

---

## 🎯 使用示例

### 创建 Markdown 笔记

```
请帮我创建一篇关于 "React Hooks 最佳实践" 的 Markdown 笔记
```

### 创建思维导图

```
帮我创建一个关于 "项目管理" 的思维导图笔记
```

### AI 对话

在 AI 面板中直接与助手对话，支持：
- 流式响应
- 历史记录
- 文件附件
- 多轮对话

### 使用模板

1. 打开模板库
2. 选择预置模板
3. 点击"应用模板"
4. AI 自动生成笔记内容

---

## 🔧 开发指南

### 添加新的 AI 提供商

1. 在 `backend/src/services/ai/providers/` 创建新的 Provider 类
2. 继承 `BaseAIProvider` 并实现 `chat()` 和 `chatStream()` 方法
3. 在 `factory.ts` 中注册新 provider
4. 更新 `AIProvider` 枚举类型

### 添加新的笔记类型

1. 在 `components/editors/` 创建新的编辑器组件
2. 在 `backend/prisma/schema.prisma` 中更新 `NoteType` 枚举
3. 在 `Editor.tsx` 中添加类型支持
4. 运行数据库迁移：`npm run prisma:migrate`

### 运行测试

```bash
# 后端测试
cd backend
npm test

# 前端测试（如果配置了）
npm test
```

### 代码规范

- 使用 TypeScript 类型注解
- 遵循 ESLint 和 Prettier 配置
- 组件使用函数式组件 + Hooks
- 使用 async/await 处理异步

---

## 🐛 故障排除

### 问题：数据库连接失败

**解决方案：**
1. 检查 PostgreSQL 服务是否运行
2. 验证 `DATABASE_URL` 配置
3. 确保数据库用户权限正确

```bash
# 检查 PostgreSQL 状态
brew services list  # macOS
systemctl status postgresql  # Linux

# 测试连接
psql postgresql://postgres:postgres@localhost:5432/ai_ignite_note
```

### 问题：AI 提供商不可用

**解决方案：**
1. 检查 API 密钥是否配置
2. 对于本地提供商，确保服务正在运行
3. 检查网络连接
4. 查看后端日志：`tail -f backend.log`

### 问题：前端无法连接后端

**解决方案：**
1. 确保后端运行在 `http://localhost:3215`
2. 检查 CORS 配置
3. 查看浏览器控制台错误

### 问题：离线同步不工作

**解决方案：**
1. 检查浏览器是否支持 IndexedDB
2. 清除浏览器缓存
3. 检查网络连接状态

### 问题：Socket.IO 连接失败

**解决方案：**
1. 确保 Socket.IO 服务已启动
2. 检查防火墙设置
3. 验证 Socket URL 配置

---

## 📖 详细文档

- [AI 助手功能文档](./AI_ASSISTANT_README.md)
- [AI 实现指南](./AI_ASSISTANT_IMPLEMENTATION.md)
- [AI 测试指南](./AI_ASSISTANT_TESTING_GUIDE.md)
- [MCP Server 文档](./backend/src/mcp/README.md)
- [开发设置指南](./DEV_SETUP.md)
- [Docker 部署指南](./DOCKER_DEPLOYMENT.md)

---

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循现有代码风格
- 添加必要的类型注解
- 编写清晰的提交信息
- 确保所有测试通过

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- GitHub Issues: https://github.com/aiignite/AIIgniteNote/issues
- 文档: https://github.com/aiignite/AIIgniteNote/wiki

---

<div align="center">

**Made with ❤️ by AI Ignite Team**

⭐ 如果这个项目对你有帮助，请给我们一个 Star！

</div>

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置指南](#配置指南)
- [API文档](#api文档)
- [Docker部署](#docker部署)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

**AI Ignite Note** 是一款功能强大的智能笔记应用，集成了多种 AI 助手，支持 Markdown、富文本、思维导图和流程图等多种笔记类型。应用采用前后端分离架构，支持离线同步、国际化主题定制，并可通过 Docker 一键部署。

---

## 功能特性

### 核心功能

- [笔记管理](#笔记管理)
- [AI助手集成](#ai助手集成)
- [模板系统](#模板系统)
- [文件夹管理](#文件夹管理)
- [用户认证](#用户认证)
- [离线同步](#离线同步)

### 笔记管理

- **多种笔记类型**
  - Markdown 笔记 - 支持 MD 编辑器
  - 富文本笔记 - 基于 React Quill
  - 思维导图 - 使用 simple-mind-map
  - 流程图 - SVG.js 绘图

- **笔记操作**
  - 创建、编辑、删除笔记
  - 实时保存
  - 标签分类
  - 收藏功能
  - 回收站

### AI助手集成

- **多AI提供商支持**
  - Google Gemini
  - Anthropic Claude
  - OpenAI GPT
  - Ollama (本地)
  - LM Studio (本地)

- **AI功能**
  - 实时聊天对话
  - 对话历史持久化
  - 预定义助手角色
  - 快速操作指令
  - 流式消息显示

### 模板系统

- **模板分类**
  - 规划 (Planning)
  - 头脑风暴 (Brainstorm)
  - 写作 (Writing)
  - 商业 (Business)
  - 开发 (Development)
  - 个人 (Personal)
  - 通用 (General)

- **模板管理**
  - 创建自定义模板
  - 模板搜索过滤
  - 应用模板生成笔记
  - 公共/私有模板

### 文件夹管理

- 树形结构组织
- 多层嵌套支持
- 拖拽排序
- 快速创建文件夹

### 用户认证

- JWT 认证机制
- Token 刷新
- 用户注册/登录
- 个人资料管理

### 离线同步

- IndexedDB 本地存储
- 自动后台同步
- 网络状态检测
- 冲突解决机制

### 其他特性

- 国际化支持 (i18n)
- 主题定制
- 响应式设计
- 可拖拽面板
- 搜索功能

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6.2 | 构建工具 |
| Zustand | 4.5 | 状态管理 |
| React Quill | 2.0 | 富文本编辑器 |
| MD Editor | 3.6 | Markdown 编辑器 |
| simple-mind-map | 0.11 | 思维导图 |
| @svgdotjs/svg.js | 3.2 | SVG 图形 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | 4.21 | Web 框架 |
| TypeScript | 5.8 | 类型安全 |
| Prisma | 5.22 | ORM |
| PostgreSQL | 15+ | 数据库 |
| JWT | 9.0 | 认证 |
| Socket.IO | 4.8 | 实时通信 |
| Winston | 3.17 | 日志管理 |

### AI SDK

| 提供商 | SDK | 说明 |
|--------|-----|------|
| Google Gemini | @google/genai | 1.37.0 |
| Anthropic Claude | @anthropic-ai/sdk | 0.32.1 |
| OpenAI GPT | openai | 4.73.1 |
| Ollama | HTTP API | 本地模型 |
| LM Studio | HTTP API | 本地模型 |

---

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- npm 或 yarn

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/aiignite/AIIgniteNoteFrontend.git
cd AIIgniteNote
```

#### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

#### 3. 配置数据库

```bash
# 在 backend 目录下
cd backend

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
# DATABASE_URL="postgresql://user:password@localhost:5432/ai_ignite_note"

# 运行数据库迁移
npm run prisma:migrate

# 生成 Prisma Client
npm run prisma:generate

# 可选：运行种子数据
npm run prisma:seed
```

#### 4. 配置 AI 提供商（可选）

在 `backend/.env` 中配置至少一个 AI 提供商：

```bash
# Google Gemini（推荐，有免费额度）
GOOGLE_AI_API_KEY=your_gemini_api_key

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Ollama（本地）
OLLAMA_API_URL=http://localhost:11434

# LM Studio（本地）
LM_STUDIO_API_URL=http://localhost:1234
```

#### 5. 启动服务

```bash
# 启动后端（终端1）
cd backend
npm run dev

# 启动前端（终端2）
npm run dev
```

#### 6. 访问应用

- 前端地址: http://localhost:3200
- 后端地址: http://localhost:4000
- API 文档: http://localhost:4000/api

首次访问需要注册新用户账户。

---

## 项目结构

```
AIIgniteNote/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── app.ts             # 应用入口
│   │   ├── config/            # 配置文件
│   │   ├── controllers/       # 控制器
│   │   ├── middleware/        # 中间件
│   │   ├── routes/            # 路由
│   │   ├── services/          # 业务逻辑
│   │   │   └── ai/           # AI 服务
│   │   │       └── providers/ # AI 提供商
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── prisma/               # 数据库 schema
│   ├── logs/                 # 日志文件
│   ├── uploads/              # 上传文件
│   ├── .env                  # 环境变量
│   ├── package.json
│   └── tsconfig.json
│
├── components/                # React 组件
│   ├── AIPanel.tsx           # AI 助手面板
│   ├── AIDashboard.tsx       # AI 仪表板
│   ├── Editor.tsx            # 笔记编辑器
│   ├── NoteList.tsx          # 笔记列表
│   ├── Sidebar.tsx           # 侧边栏
│   ├── Settings.tsx          # 设置页面
│   ├── TemplateGallery.tsx   # 模板库
│   └── editors/              # 编辑器组件
│
├── services/                  # 前端服务
│   ├── api.ts                # API 客户端
│   ├── indexedDB.ts          # 本地存储
│   └── offlineSync.ts        # 离线同步
│
├── store/                     # 状态管理
│   ├── languageStore.ts      # 语言设置
│   └── themeStore.ts         # 主题设置
│
├── App.tsx                    # 应用入口
├── types.ts                   # 类型定义
├── vite.config.ts            # Vite 配置
├── package.json
└── README.md

```

---

## 配置指南

### AI 提供商配置

#### Google Gemini（推荐）

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建 API 密钥
3. 在 `.env` 中设置：
   ```bash
   GOOGLE_AI_API_KEY=your_api_key
   ```

**可用模型：**
- `gemini-2.0-flash-exp`（最新，推荐）
- `gemini-1.5-pro`
- `gemini-1.5-flash`

#### Anthropic Claude

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建 API 密钥
3. 在 `.env` 中设置：
   ```bash
   ANTHROPIC_API_KEY=your_api_key
   ```

**可用模型：**
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet-20241022`

#### OpenAI GPT

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 创建 API 密钥
3. 在 `.env` 中设置：
   ```bash
   OPENAI_API_KEY=your_api_key
   ```

**可用模型：**
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-3.5-turbo`

#### Ollama（本地）

1. 安装 Ollama: https://ollama.ai/
2. 启动服务: `ollama serve`
3. 在 `.env` 中设置：
   ```bash
   OLLAMA_API_URL=http://localhost:11434
   ```

#### LM Studio（本地）

1. 安装 LM Studio: https://lmstudio.ai/
2. 启动应用并启用 API 服务器
3. 在 `.env` 中设置：
   ```bash
   LM_STUDIO_API_URL=http://localhost:1234
   ```

---

## API 文档

### 认证

#### 注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "username": "username"
}
```

#### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### 笔记

#### 获取笔记列表

```http
GET /api/notes
Authorization: Bearer {token}
```

#### 创建笔记

```http
POST /api/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "笔记标题",
  "content": "笔记内容",
  "noteType": "MARKDOWN",
  "folderId": "folder-id"
}
```

#### 更新笔记

```http
PUT /api/notes/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容"
}
```

#### 删除笔记

```http
DELETE /api/notes/{id}
Authorization: Bearer {token}
```

### AI 助手

#### 获取提供商列表

```http
GET /api/ai/providers
Authorization: Bearer {token}
```

#### 发送聊天消息

```http
POST /api/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "GOOGLE",
  "model": "gemini-2.0-flash-exp",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

#### 获取对话历史

```http
GET /api/ai/conversations
Authorization: Bearer {token}
```

### 模板

#### 获取模板列表

```http
GET /api/templates?search=关键词&category=Planning
Authorization: Bearer {token}
```

#### 创建模板

```http
POST /api/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "模板名称",
  "description": "模板描述",
  "prompt": "AI 提示词",
  "category": "Planning",
  "noteType": "MARKDOWN",
  "isPublic": true
}
```

#### 应用模板

```http
POST /api/templates/{id}/apply
Authorization: Bearer {token}
Content-Type: application/json

{
  "workspaceId": "workspace-id",
  "folderId": "folder-id"
}
```

---

## Docker 部署

项目支持 Docker Compose 一键部署，详见 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

### 快速启动

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑 .env 文件，添加 AI 提供商 API 密钥
nano .env

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 初始化数据库
docker-compose exec backend npx prisma migrate deploy
```

### 服务访问

- 前端: http://localhost:3200
- 后端 API: http://localhost:4000
- 健康检查: http://localhost:4000/health
- 数据库: localhost:5434

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除所有数据（包括数据库）
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build
```

---

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循现有代码风格
- 添加必要的类型注解
- 编写清晰的提交信息
- 确保所有测试通过

---

## 故障排除

### 问题：数据库连接失败

**解决方案：**
1. 检查 PostgreSQL 服务是否运行
2. 验证 `DATABASE_URL` 配置
3. 确保数据库用户权限正确

### 问题：AI 提供商不可用

**解决方案：**
1. 检查 API 密钥是否配置
2. 对于本地提供商，确保服务正在运行
3. 重启后端服务

### 问题：前端无法连接后端

**解决方案：**
1. 确保后端运行在 `http://localhost:4000`
2. 检查 CORS 配置
3. 查看浏览器控制台错误

### 问题：离线同步不工作

**解决方案：**
1. 检查 IndexedDB 是否启用
2. 清除浏览器缓存
3. 查看网络连接状态

---

## 详细文档

- [AI 助手功能文档](./AI_ASSISTANT_README.md)
- [Docker 部署指南](./DOCKER_DEPLOYMENT.md)
- [实现指南](./AI_ASSISTANT_IMPLEMENTATION.md)
- [测试指南](./AI_ASSISTANT_TESTING_GUIDE.md)

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 联系方式

- GitHub Issues: https://github.com/aiignite/AIIgniteNoteFrontend/issues
- 文档: https://github.com/aiignite/AIIgniteNoteFrontend/wiki

---

<div align="center">

**Made with ❤️ by AI Ignite Team**

</div>
