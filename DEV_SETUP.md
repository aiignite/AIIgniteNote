# AI Ignite Note - 本地开发模式快速启动指南

## 开发模式架构

```
┌─────────────────────────────────────────────────────────────┐
│                        本地开发环境                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   前端开发    │         │   后端开发    │                 │
│  │   (本地)     │────────▶│   (本地)     │                 │
│  │   :3200      │         │   :4000      │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                         │
│                                   │ Prisma                  │
│                                   ▼                         │
│                          ┌──────────────┐                  │
│                          │  PostgreSQL  │                  │
│                          │  (Docker)    │                  │
│                          │   :5432      │                  │
│                          └──────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 前置要求

- Node.js 18+
- npm 或 pnpm
- Docker Desktop (或 Docker Engine)

## 启动步骤

### 1. 启动数据库 (Docker)

```bash
# 在项目根目录执行
docker-compose -f docker-compose.dev.yml up -d

# 查看数据库状态
docker-compose -f docker-compose.dev.yml ps

# 查看数据库日志
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### 2. 配置后端环境变量

```bash
# 进入后端目录
cd backend

# 复制开发环境配置
cp .env.dev .env

# 编辑 .env 文件，添加至少一个 AI 提供商的 API 密钥
# 推荐使用 Google Gemini (有免费额度): https://makersuite.google.com/app/apikey
nano .env  # 或使用你喜欢的编辑器
```

### 3. 初始化数据库

```bash
# 确保在 backend 目录
cd backend

# 安装依赖 (首次运行)
npm install

# 生成 Prisma Client
npx prisma generate

# 推送数据库结构
npx prisma db push

# (可选) 填充模板数据
npx tsx prisma/seedTemplates.ts
```

### 4. 启动后端 (开发模式)

```bash
# 在 backend 目录
npm run dev

# 后端将在 http://localhost:4000 运行
# 健康检查: http://localhost:4000/health
# API 文档: http://localhost:4000/api/
```

### 5. 启动前端 (开发模式)

```bash
# 新开一个终端，回到项目根目录
cd /Users/wyh/Documents/AIIgnite/AIIgniteNote

# 安装依赖 (首次运行)
npm install

# 启动开发服务器
npm run dev

# 前端将在 http://localhost:3200 运行
```

## 常用命令

### 数据库管理

```bash
# 停止数据库
docker-compose -f docker-compose.dev.yml down

# 停止并删除数据库数据 (警告：会清空所有数据)
docker-compose -f docker-compose.dev.yml down -v

# 重启数据库
docker-compose -f docker-compose.dev.yml restart

# 连接到数据库
docker exec -it aiignitenote-postgres-dev psql -U aiignite -d ai_ignite_note
```

### Prisma 数据库操作

```bash
# 在 backend 目录执行

# 查看数据库结构
npx prisma studio

# 重置数据库 (开发环境)
npx prisma migrate reset

# 创建新的迁移
npx prisma migrate dev --name <migration-name>

# 格式化 schema.prisma
npx prisma format
```

## 开发环境端口

| 服务 | 端口 |
|------|------|
| 前端开发服务器 | 3200 |
| 后端 API | 4000 |
| PostgreSQL | 5432 |

## 故障排查

### 数据库连接失败

```bash
# 检查数据库容器是否运行
docker ps | grep postgres

# 检查数据库日志
docker-compose -f docker-compose.dev.yml logs postgres

# 测试数据库连接
docker exec -it aiignitenote-postgres-dev pg_isready -U aiignite
```

### 端口被占用

如果 5432 端口被占用，可以修改端口：

```bash
# 编辑 docker-compose.dev.yml，修改端口映射
ports:
  - "5433:5432"  # 使用 5433 端口

# 同时修改 backend/.env 中的 DATABASE_URL
DATABASE_URL="postgresql://aiignite:aiignite_password@localhost:5433/ai_ignite_note?schema=public"
```

### Prisma Client 过期

```bash
# 在 backend 目录执行
npx prisma generate
```

## 环境变量说明

### 后端 (.env)

```bash
# 数据库连接 (连接到 Docker 中的数据库)
DATABASE_URL="postgresql://aiignite:aiignite_password@localhost:5432/ai_ignite_note?schema=public"

# 至少配置一个 AI 提供商
GOOGLE_AI_API_KEY="your-api-key"  # 推荐
```

### 前端

前端通过 `services/api.ts` 调用后端 API，开发环境默认指向 `http://localhost:4000`。

## 生产模式部署

如果要部署完整的 Docker 应用（前端 + 后端 + 数据库），请使用：

```bash
# 配置环境变量
cp .env.docker.example .env
nano .env  # 添加 API 密钥

# 启动完整应用
docker-compose up -d
```

## 更多信息

- [Docker 部署指南](DOCKER_DEPLOYMENT.md)
- [AI 助手实现文档](AI_ASSISTANT_IMPLEMENTATION.md)
