# 全栈后端集成设计文档

## 概述

本设计文档描述了为AI Ignite Note前端应用添加完整后端支持的技术架构。该方案将保持现有前端UI不变，通过API集成、IndexedDB缓存和Docker容器化实现完整的全栈解决方案。

## 架构设计

### 整体架构

```mermaid
graph TB
    subgraph "前端层"
        A[React App] --> B[API Client]
        A --> C[IndexedDB Cache]
        B --> D[HTTP Client]
    end
    
    subgraph "后端层"
        E[Express API Server] --> F[Authentication Middleware]
        E --> G[Route Handlers]
        G --> H[Business Logic]
        H --> I[Prisma ORM]
    end
    
    subgraph "数据层"
        I --> J[PostgreSQL Database]
        E --> K[File Storage]
        E --> L[Gemini AI Proxy]
    end
    
    subgraph "部署层"
        M[Docker Frontend] --> N[Nginx]
        O[Docker Backend] --> P[Node.js]
        Q[Docker Database] --> R[PostgreSQL]
    end
    
    D --> E
    C -.-> A
    L --> S[Google Gemini API]
```

### 技术栈选择

**后端技术栈**:
- **运行时**: Node.js 18+ (与前端TypeScript保持一致)
- **框架**: Express.js (成熟稳定，中间件丰富)
- **ORM**: Prisma (类型安全，与TypeScript完美集成)
- **认证**: JWT + bcrypt (无状态认证)
- **文件上传**: Multer + 本地存储
- **实时通信**: Socket.io (WebSocket支持)
- **AI集成**: 
  - Google Gemini (@google/genai)
  - Anthropic Claude (@anthropic-ai/sdk)
  - OpenAI (openai)
  - Ollama (本地HTTP API)
  - LM Studio (本地HTTP API)

**数据库**:
- **主数据库**: PostgreSQL 15+ (使用现有架构)
- **全文搜索**: PostgreSQL tsvector (内置支持)
- **连接池**: pg-pool (性能优化)

**容器化**:
- **容器**: Docker + Docker Compose
- **前端服务**: Nginx (静态文件服务)
- **反向代理**: Nginx (API代理和负载均衡)

## 组件设计

### 后端API服务架构

```typescript
// 项目结构
backend/
├── src/
│   ├── controllers/     # 控制器层
│   ├── services/        # 业务逻辑层
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由定义
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   └── app.ts           # 应用入口
├── prisma/
│   ├── schema.prisma    # 数据库模型
│   └── migrations/      # 数据库迁移
├── uploads/             # 文件上传目录
└── docker/              # Docker配置
```

### API接口设计

**认证相关**:
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

**用户管理**:
```typescript
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/settings
PUT    /api/users/settings
```

**笔记管理**:
```typescript
GET    /api/notes              # 获取笔记列表（支持分页、筛选）
POST   /api/notes              # 创建新笔记
GET    /api/notes/:id          # 获取单个笔记
PUT    /api/notes/:id          # 更新笔记
DELETE /api/notes/:id          # 删除笔记（软删除）
GET    /api/notes/:id/versions # 获取笔记版本历史
```

**文件夹和标签**:
```typescript
GET    /api/folders            # 获取文件夹树
POST   /api/folders            # 创建文件夹
PUT    /api/folders/:id        # 更新文件夹
DELETE /api/folders/:id        # 删除文件夹

GET    /api/tags               # 获取标签列表
POST   /api/tags               # 创建标签
PUT    /api/tags/:id           # 更新标签
DELETE /api/tags/:id           # 删除标签
```

**搜索功能**:
```typescript
GET    /api/search?q=keyword&type=notes&page=1&limit=20
```

**AI功能**:
```typescript
POST   /api/ai/chat            # AI对话（支持多提供商）
GET    /api/ai/conversations   # 获取对话历史
POST   /api/ai/templates       # 使用AI模板
GET    /api/ai/templates       # 获取模板列表
GET    /api/ai/providers       # 获取可用的AI提供商列表
PUT    /api/ai/settings        # 配置AI提供商设置
```

### AI服务适配器设计

```typescript
// services/ai/AIProvider.ts
interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
}

// 统一的AI响应格式
interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// AI提供商工厂
class AIProviderFactory {
  static create(provider: AIProviderType, config: AIConfig): AIProvider {
    switch (provider) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'lmstudio':
        return new LMStudioProvider(config);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

// Gemini提供商实现
class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  
  constructor(config: AIConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const model = this.client.getGenerativeModel({ 
      model: options?.model || 'gemini-pro' 
    });
    const result = await model.generateContent(this.formatMessages(messages));
    return this.formatResponse(result);
  }
}

// Anthropic提供商实现
class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  
  constructor(config: AIConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: options?.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 4096,
      messages: this.formatMessages(messages)
    });
    return this.formatResponse(response);
  }
}

// OpenAI提供商实现
class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  
  constructor(config: AIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4-turbo-preview',
      messages: this.formatMessages(messages)
    });
    return this.formatResponse(response);
  }
}

// Ollama提供商实现（本地部署）
class OllamaProvider implements AIProvider {
  name = 'ollama';
  private baseURL: string;
  
  constructor(config: AIConfig) {
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama2',
        messages: this.formatMessages(messages),
        stream: false
      })
    });
    return this.formatResponse(await response.json());
  }
}

// LM Studio提供商实现（本地部署）
class LMStudioProvider implements AIProvider {
  name = 'lmstudio';
  private baseURL: string;
  
  constructor(config: AIConfig) {
    this.baseURL = config.baseURL || 'http://localhost:1234';
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    // LM Studio使用OpenAI兼容的API
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'local-model',
        messages: this.formatMessages(messages)
      })
    });
    return this.formatResponse(await response.json());
  }
}
```

**文件上传**:
```typescript
POST   /api/attachments        # 上传文件
GET    /api/attachments/:id    # 获取文件
DELETE /api/attachments/:id    # 删除文件
```

### 前端API客户端设计

```typescript
// services/api.ts
class ApiClient {
  private baseURL: string;
  private token: string | null;
  
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    this.token = localStorage.getItem('auth_token');
  }
  
  // HTTP方法封装
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    // 实现请求拦截、错误处理、token管理
  }
  
  // 认证相关
  auth = {
    login: (credentials: LoginCredentials) => this.request('/auth/login', {...}),
    register: (userData: RegisterData) => this.request('/auth/register', {...}),
    refresh: () => this.request('/auth/refresh', {...}),
  };
  
  // 笔记相关
  notes = {
    list: (params?: NotesListParams) => this.request('/notes', {...}),
    create: (note: CreateNoteData) => this.request('/notes', {...}),
    update: (id: string, note: UpdateNoteData) => this.request(`/notes/${id}`, {...}),
    delete: (id: string) => this.request(`/notes/${id}`, {...}),
  };
}
```

### IndexedDB缓存设计

```typescript
// services/indexedDB.ts
class IndexedDBCache {
  private db: IDBDatabase;
  
  // 数据库结构
  private stores = {
    notes: 'notes',
    folders: 'folders', 
    tags: 'tags',
    users: 'users',
    settings: 'settings'
  };
  
  async init(): Promise<void> {
    // 初始化IndexedDB数据库和对象存储
  }
  
  // 缓存操作
  async set<T>(store: string, key: string, data: T): Promise<void> {
    // 存储数据到IndexedDB
  }
  
  async get<T>(store: string, key: string): Promise<T | null> {
    // 从IndexedDB获取数据
  }
  
  async sync(): Promise<void> {
    // 同步本地更改到服务器
  }
}
```

## 数据模型

### Prisma Schema设计

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  isActive      Boolean   @default(true)
  
  // 关系
  notes         Note[]
  folders       Folder[]
  workspaces    WorkspaceMember[]
  settings      UserSettings?
  
  @@map("users")
}

model Note {
  id          String    @id @default(cuid())
  title       String
  content     String
  type        NoteType  @default(MARKDOWN)
  authorId    String
  folderId    String?
  isFavorite  Boolean   @default(false)
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  viewCount   Int       @default(0)
  
  // 关系
  author      User      @relation(fields: [authorId], references: [id])
  folder      Folder?   @relation(fields: [folderId], references: [id])
  tags        NotesOnTags[]
  versions    NoteVersion[]
  attachments Attachment[]
  
  @@map("notes")
}

model AIConversation {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String?
  title       String?
  provider    AIProvider @default(GEMINI)
  model       String    @default("gemini-pro")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // 关系
  user        User      @relation(fields: [userId], references: [id])
  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
  messages    AIMessage[]
  
  @@map("ai_conversations")
}

model AIMessage {
  id              String    @id @default(cuid())
  conversationId  String
  role            String
  content         String
  tokens          Int?
  createdAt       DateTime  @default(now())
  
  // 关系
  conversation    AIConversation @relation(fields: [conversationId], references: [id])
  
  @@map("ai_messages")
}

model UserSettings {
  id                  String    @id @default(cuid())
  userId              String    @unique
  theme               String    @default("system")
  defaultNoteType     NoteType  @default(MARKDOWN)
  aiProvider          AIProvider @default(GEMINI)
  aiModel             String?
  sidebarWidth        Int       @default(380)
  assistantPanelOpen  Boolean   @default(true)
  assistantPanelWidth Int       @default(360)
  language            String    @default("zh-CN")
  timezone            String    @default("Asia/Shanghai")
  notificationsEnabled Boolean  @default(true)
  autoSaveInterval    Int       @default(30)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // 关系
  user                User      @relation(fields: [userId], references: [id])
  
  @@map("user_settings")
}

enum AIProvider {
  GEMINI
  ANTHROPIC
  OPENAI
  OLLAMA
  LMSTUDIO
}

enum NoteType {
  MARKDOWN
  RICHTEXT
  MINDMAP
  FLOWCHART
}
```

### 数据库索引策略

```sql
-- 性能优化索引
CREATE INDEX idx_notes_author_updated ON notes(author_id, updated_at DESC);
CREATE INDEX idx_notes_folder ON notes(folder_id) WHERE is_deleted = false;
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('simple', title || ' ' || content));
CREATE INDEX idx_notes_tags ON notes_on_tags(note_id, tag_id);
```

## 错误处理

### 统一错误响应格式

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    total?: number;
  };
}
```

### 错误处理中间件

```typescript
// middleware/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
};
```

## 测试策略

### 后端测试

**单元测试**:
- 使用Jest + Supertest
- 测试所有API端点
- 模拟数据库操作
- 覆盖率目标: 80%+

**集成测试**:
- 测试数据库集成
- 测试AI API集成
- 测试文件上传功能

**API测试示例**:
```typescript
describe('Notes API', () => {
  test('should create a new note', async () => {
    const noteData = {
      title: 'Test Note',
      content: 'Test content',
      type: 'MARKDOWN'
    };
    
    const response = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(noteData)
      .expect(201);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(noteData.title);
  });
});
```

### 前端测试

**组件测试**:
- React Testing Library
- 测试API集成组件
- 测试IndexedDB缓存逻辑

**E2E测试**:
- Playwright
- 测试完整用户流程
- 测试离线功能

## Docker部署配置

### Docker Compose架构

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:4000/api

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    ports:
      - "4000:4000"
    depends_on:
      - database
    environment:
      - DATABASE_URL=postgresql://postgres:password@database:5432/aiignitenote
      - JWT_SECRET=${JWT_SECRET}
      # AI Provider API Keys
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      # Local AI Providers
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      - LMSTUDIO_BASE_URL=${LMSTUDIO_BASE_URL:-http://host.docker.internal:1234}
    volumes:
      - ./uploads:/app/uploads

  database:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=aiignitenote
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./ai-ignite-note.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

### Dockerfile配置

**前端Dockerfile**:
```dockerfile
# docker/frontend.Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**后端Dockerfile**:
```dockerfile
# docker/backend.Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "start"]
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在分析所有验收标准后，我识别出以下可测试的属性模式：
- **API一致性属性**: 所有API端点应返回统一的响应格式
- **数据完整性属性**: 数据库操作应保持数据一致性和完整性
- **认证安全属性**: 所有受保护资源应正确验证用户身份
- **缓存同步属性**: IndexedDB缓存应与服务器数据保持同步
- **文件管理属性**: 文件操作应正确处理存储和权限

### 核心正确性属性

**属性 1: API响应格式一致性**
*对于任何* API端点和任何请求，成功响应应包含success字段为true和data字段，错误响应应包含success字段为false和error字段
**验证需求: 1.5, 2.1, 2.2, 3.1, 3.2**

**属性 2: 用户认证令牌有效性**
*对于任何* 有效的用户凭据，登录应返回有效的JWT令牌，该令牌应能够访问受保护的API端点
**验证需求: 2.1, 2.2, 2.3**

**属性 3: 笔记数据持久化一致性**
*对于任何* 笔记创建或更新操作，数据库中存储的数据应与API请求中的数据完全一致
**验证需求: 3.1, 3.3**

**属性 4: 软删除数据完整性**
*对于任何* 被软删除的笔记，该笔记应在数据库中标记为已删除但数据保持完整，且不应在正常查询中返回
**验证需求: 3.4**

**属性 5: 全文搜索结果相关性**
*对于任何* 搜索查询，返回的所有笔记都应包含查询关键词在标题或内容中
**验证需求: 3.5, 9.1, 9.2**

**属性 6: 文件夹层级关系完整性**
*对于任何* 文件夹操作，父子关系应保持一致，删除父文件夹时子项目应正确重新分配
**验证需求: 4.1, 4.5**

**属性 7: 标签关联双向一致性**
*对于任何* 笔记和标签的关联操作，从笔记查询标签和从标签查询笔记应返回一致的关联关系
**验证需求: 4.3, 4.4**

**属性 8: AI多提供商响应完整性**
*对于任何* 支持的AI提供商（Gemini、Anthropic、OpenAI、Ollama、LM Studio），发送到AI服务的请求应正确路由到对应提供商并返回统一格式的完整响应数据
**验证需求: 5.1, 5.5**

**属性 9: 文件上传存储一致性**
*对于任何* 成功上传的文件，文件应存储在服务器上且数据库记录应包含正确的文件路径和元数据
**验证需求: 6.1, 6.2**

**属性 10: 用户权限访问控制**
*对于任何* 受保护的资源访问，只有具有适当权限的用户应能够访问该资源
**验证需求: 6.4, 7.3**

**属性 11: IndexedDB缓存数据同步**
*对于任何* API响应数据，IndexedDB中的缓存数据应与服务器返回的数据保持一致
**验证需求: 8.3, 8.5**

**属性 12: 离线数据访问完整性**
*对于任何* 缓存在IndexedDB中的数据，在离线状态下应能够完整访问且数据结构保持一致
**验证需求: 8.4**

**属性 13: 搜索结果排序一致性**
*对于任何* 搜索查询，结果应按照相关性和更新时间的组合进行一致的排序
**验证需求: 9.5**

**属性 14: Docker容器环境配置有效性**
*对于任何* 环境变量配置，容器应正确读取并应用配置，服务应能够正常启动和运行
**验证需求: 10.3, 10.4**

**属性 15: 数据迁移完整性保证**
*对于任何* 数据迁移操作，迁移后的数据应与原始数据在结构和内容上保持完全一致
**验证需求: 11.3, 11.4**

## 测试策略

### 双重测试方法

本项目采用单元测试和基于属性的测试相结合的方法：

**单元测试**:
- 验证特定示例和边缘情况
- 测试API端点的具体功能
- 验证数据库连接和配置
- 测试Docker容器启动

**基于属性的测试**:
- 验证跨所有输入的通用属性
- 使用随机生成的测试数据
- 每个属性测试运行最少100次迭代
- 测试标签格式: **Feature: fullstack-backend-integration, Property {number}: {property_text}**

### 测试框架配置

**后端测试**:
- **单元测试**: Jest + Supertest
- **属性测试**: fast-check (JavaScript属性测试库)
- **数据库测试**: 使用测试数据库实例
- **API测试**: 完整的HTTP请求/响应测试

**前端测试**:
- **组件测试**: React Testing Library
- **IndexedDB测试**: fake-indexeddb (模拟IndexedDB)
- **API集成测试**: MSW (Mock Service Worker)
- **E2E测试**: Playwright

**集成测试**:
- **Docker测试**: Testcontainers
- **数据库集成**: 真实PostgreSQL实例
- **AI集成**: Gemini API模拟服务

### 测试数据生成策略

**智能生成器**:
- 用户数据生成器: 生成有效的邮箱、密码组合
- 笔记数据生成器: 生成不同类型和长度的笔记内容
- 文件夹层级生成器: 生成有效的层级结构
- 搜索查询生成器: 生成有意义的搜索关键词

**边缘情况处理**:
- 空数据和null值处理
- 超长字符串和特殊字符
- 并发操作和竞态条件
- 网络中断和超时情况