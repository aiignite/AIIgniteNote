<div align="center">

# AI Ignite Note

### 智能 AI 笔记应用 - 支持多种笔记类型与 AI 助手集成

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-cyan)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
