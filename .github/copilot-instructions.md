# AI Ignite Note - AI 编程助手指南

## 项目架构概览

### 技术栈
- **前端**: React 18.2 + TypeScript + Vite + Zustand (状态管理)
- **后端**: Express + TypeScript + Prisma ORM + Socket.IO
- **数据库**: PostgreSQL (通过 Prisma ORM)
- **本地开发**: 无需 Docker，使用本地 PostgreSQL

### 目录结构
```
├── backend/              # Express 后端服务
│   ├── src/
│   │   ├── app.ts       # 应用入口,配置中间件和路由
│   │   ├── config/      # 配置文件(数据库、环境变量)
│   │   ├── routes/      # API 路由定义
│   │   ├── controllers/ # 业务逻辑控制器
│   │   ├── services/    # 核心业务服务层(Service模式)
│   │   ├── middleware/  # 认证、上传、错误处理中间件
│   │   ├── socket/      # Socket.IO 实时通信
│   │   └── types/       # TypeScript 类型定义
│   └── prisma/          # Prisma schema 和 migrations
├── components/          # React 组件
├── services/            # 前端 API 服务层
├── store/               # Zustand 状态管理
└── docs/                # 项目文档(仅放必要的总结文档)
```

## 核心开发模式

### 1. 后端服务层模式
所有业务逻辑放在 Service 类中,遵循单例导出模式:
```typescript
export class NotesService {
  async createNote(userId: string, data: CreateNoteInput) { ... }
}
export const notesService = new NotesService();
```

**关键服务**:
- `AIService`: 多 AI 提供商集成(Gemini/Claude/OpenAI/Ollama/LMStudio)
- `NotesService`: 笔记 CRUD,支持 4 种类型(MARKDOWN/RICHTEXT/MINDMAP/FLOWCHART)
- `ChatService`: 实时聊天消息持久化
- `AuthService`: JWT 认证和用户管理

### 2. AI 提供商工厂模式
使用工厂模式统一管理多个 AI 提供商,位于 `backend/src/services/ai/`:
```typescript
AIProviderFactory.createProvider(provider, config)
```
- 支持流式响应(SSE)
- 每个 provider 继承 `BaseAIProvider`
- 配置优先级: 自定义模型配置 > 用户设置 > 环境变量

### 3. API 响应规范
统一使用 `ApiSuccess<T>` 和 `ApiError` 类型:
```typescript
// 成功响应
{ success: true, data: T, meta?: { pagination, total } }
// 错误响应
{ success: false, error: { code, message, details }, timestamp }
```

### 4. 数据库访问
- 使用 Prisma Client: `import { prisma } from '../config/database'`
- Schema 位于 `backend/prisma/schema.prisma`
- 关键模型: `User`, `Note`, `AIConversation`, `AIModel`, `Workspace`

## 关键工作流

### 启动开发环境

#### 推荐方式：使用启动脚本（本地开发）
```bash
# 在项目根目录执行（前提：已安装 PostgreSQL 并启动）
bash start.sh

# 脚本会自动完成以下操作：
# 1. 检查 Node.js 和依赖
# 2. 安装前端和后端依赖
# 3. 初始化数据库（Prisma 迁移）
# 4. 启动后端服务 (端口 3215)
# 5. 启动前端服务 (端口 3210)
```

#### 本地开发环境前置要求
1. **安装 PostgreSQL 14+**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **配置数据库**
   ```bash
   # 运行数据库初始化脚本
   bash setup-local-db.sh
   ```

#### 手动启动（本地开发）
如果需要分别启动前后端，可以使用以下命令：
```bash
# 终端1：启动后端 (端口 3215)
cd backend
npm install
npm run prisma:generate     # 生成 Prisma Client
npm run prisma:migrate      # 运行数据库迁移
npm run dev

# 终端2：启动前端 (端口 3210)
npm install
npm run dev
```

#### 环境配置文件
- 前端配置：无需配置，自动连接本地后端（http://localhost:3215）
- 后端配置：`backend/.env` 需包含以下关键变量
  ```
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_ignite_note
  JWT_SECRET=your_secret_key
  NODE_ENV=development
  ```

### 添加新 API 端点
1. 在 `backend/src/services/` 添加/扩展 Service 类
2. 在 `backend/src/controllers/` 创建 Controller 函数
3. 在 `backend/src/routes/` 注册路由
4. 在 `backend/src/app.ts` 中引入路由
5. 在 `services/api.ts` (前端)添加对应的 API 调用函数

### 添加新的 AI 提供商
1. 在 `backend/src/services/ai/providers/` 创建新的 Provider 类
2. 继承 `BaseAIProvider` 并实现 `chat()` 和 `chatStream()` 方法
3. 在 `factory.ts` 中注册新 provider
4. 更新 `AIProvider` 枚举类型

## 项目特定约定

### 命名规范
- **文件命名**: kebab-case (如 `ai-assistants.service.ts`)
- **类命名**: PascalCase + 后缀 (`NotesService`, `AuthController`)
- **路由前缀**: 所有 API 路由以 `/api` 开头
- **环境变量**: SCREAMING_SNAKE_CASE

### 中间件使用
- `authenticate`: 需要 JWT 认证,将 `userId` 注入 `req.userId`
- `optionalAuth`: 可选认证,不阻塞请求
- `upload.single('file')`: 文件上传(multer)
- `validate(schema)`: Zod 验证中间件

### Socket.IO 事件
位于 `backend/src/socket/index.ts`,关键事件:
- `join_chat`: 用户加入聊天
- `send_message`: 发送消息(自动持久化到数据库)
- `receive_message`: 接收消息广播
- `typing_start/stop`: 输入状态

### AI 对话流式传输
使用 SSE(Server-Sent Events)实现流式响应:
- 禁用该路由的 compression 中间件
- 使用异步生成器 `async function* chatStream()`
- 前端通过 EventSource 接收

## 特殊注意事项

### CORS 配置
- 后端支持本地开发源：`localhost:3210` (前端), `localhost:3215` (后端)
- 配置位于 `backend/src/app.ts`

### 文件上传
- 上传目录: `backend/uploads/`
- 最大文件大小: 配置在 `backend/src/config/index.ts`
- 支持附件类型: 图片、文档、AI 对话附件

### 离线同步
- 前端使用 IndexedDB (`services/indexedDB.ts`) 缓存笔记
- 通过 `offlineSync.ts` 实现离线编辑和同步队列

### 数据库迁移
- **重要**: 修改 schema 后,必须运行 `npm run prisma:migrate` 并提交 migration 文件
- Migration 文件位于 `backend/prisma/migrations/`

## 编程规范

- **使用中文进行所有问答和注释**
- **使用 feedback MCP 工具反馈任务进度**,保持用户知情
- **不要生成过程文档**,仅在总结时生成文档并放入 `docs/` 文件夹
- **错误处理**: 使用 `ApiErrorClass` 抛出标准化错误
- **日志记录**: 使用 Winston logger (`utils/logger.ts`),避免 `console.log`
- **类型安全**: 充分利用 TypeScript,避免 `any` 类型
- **异步操作**: 统一使用 `async/await`,避免回调地狱

## 常见问题解决

### 数据库连接问题
检查 `backend/.env` 中的 `DATABASE_URL`,确保 PostgreSQL 服务已启动

### AI API 调用失败
1. 检查环境变量中的 API Key 配置
2. 查看 `backend/src/config/index.ts` 确认 provider 配置
3. 检查网络是否可访问相关 API 端点

### Socket.IO 连接失败
确保前端 Socket 配置的 URL 与后端服务地址一致(`services/socket.ts`)

---

**参考文档**: 
