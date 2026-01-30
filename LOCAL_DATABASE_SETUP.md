# 本地数据库设置指南

## 🎯 快速开始

### 方式一：自动设置（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x setup-local-db.sh

# 2. 运行设置脚本
./setup-local-db.sh
```

### 方式二：手动设置

#### 1. 安装 PostgreSQL

```bash
# macOS (使用 Homebrew)
brew install postgresql@14

# 启动 PostgreSQL 服务
brew services start postgresql@14

# 验证安装
psql --version
```

#### 2. 创建数据库

```bash
# 连接到 PostgreSQL
psql postgres

# 在 psql 中执行以下命令:
CREATE DATABASE ai_ignite_note;

# 退出 psql
\q
```

#### 3. 导入数据库架构

```bash
# 方法 A: 使用 SQL 文件导入
psql -U postgres -d ai_ignite_note -f ai-ignite-note.sql

# 方法 B: 使用 Prisma 迁移
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
# 或者
npx prisma db push
```

#### 4. 配置环境变量

在 `backend/.env` 文件中添加：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_ignite_note?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT="3000"
CORS_ORIGIN="http://localhost:5173"
```

#### 5. 验证数据库

```bash
# 连接到数据库
psql -U postgres -d ai_ignite_note

# 查看所有表
\dt

# 查看特定表结构
\d "User"

# 退出
\q
```

## 🔧 常用命令

### PostgreSQL 服务管理

```bash
# 启动服务
brew services start postgresql@14

# 停止服务
brew services stop postgresql@14

# 重启服务
brew services restart postgresql@14

# 查看服务状态
brew services list | grep postgresql
```

### 数据库操作

```bash
# 连接到数据库
psql -U postgres -d ai_ignite_note

# 列出所有数据库
psql -U postgres -l

# 删除数据库（谨慎使用）
psql -U postgres -c "DROP DATABASE ai_ignite_note;"

# 重新创建数据库
psql -U postgres -c "CREATE DATABASE ai_ignite_note;"
```

### Prisma 命令

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 推送 schema 到数据库（开发环境）
npx prisma db push

# 创建迁移
npx prisma migrate dev --name init

# 应用迁移（生产环境）
npx prisma migrate deploy

# 打开 Prisma Studio（数据库可视化工具）
npx prisma studio

# 重置数据库（删除所有数据）
npx prisma migrate reset
```

## 📊 数据库结构

项目使用以下主要表：

- **User** - 用户表
- **Workspace** - 工作空间表
- **Note** - 笔记表
- **Folder** - 文件夹表
- **Tag** - 标签表
- **Attachment** - 附件表
- **Template** - 模板表
- **AIAssistant** - AI 助手表
- **AIChat** - AI 对话表
- **AIChatMessage** - AI 消息表

## 🐛 常见问题

### 1. PostgreSQL 未安装或未运行

```bash
# 检查是否安装
which psql

# 如果未安装
brew install postgresql@14

# 启动服务
brew services start postgresql@14
```

### 2. 连接被拒绝

```bash
# 检查服务状态
brew services list | grep postgresql

# 检查端口
lsof -i :5432

# 重启服务
brew services restart postgresql@14
```

### 3. 数据库已存在

```bash
# 删除旧数据库
psql -U postgres -c "DROP DATABASE IF EXISTS ai_ignite_note;"

# 创建新数据库
psql -U postgres -c "CREATE DATABASE ai_ignite_note;"

# 重新导入
psql -U postgres -d ai_ignite_note -f ai-ignite-note.sql
```

### 4. 权限问题

```bash
# 如果遇到权限问题，可以为用户授权
psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ai_ignite_note TO postgres;"
```

### 5. Prisma 迁移失败

```bash
cd backend

# 重置数据库
npx prisma migrate reset

# 重新生成 client
npx prisma generate

# 推送 schema
npx prisma db push
```

## 🧪 测试数据库连接

创建测试文件 `backend/test-db.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    
    // 查询用户数量
    const userCount = await prisma.user.count();
    console.log(`📊 用户总数: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

testConnection();
```

运行测试：

```bash
cd backend
node test-db.js
```

## 🚀 启动应用

```bash
# 1. 启动后端
cd backend
npm install
npm run dev

# 2. 在新终端启动前端
cd ..
npm install
npm run dev

# 3. 访问应用
open http://localhost:5173
```

## 📝 创建管理员用户

```bash
cd backend

# 使用 create-admin.ts 脚本
npx ts-node create-admin.ts

# 或者在 psql 中手动创建
psql -U postgres -d ai_ignite_note
```

SQL 创建管理员：

```sql
INSERT INTO "User" (id, email, password, name, "emailVerified")
VALUES (
  'admin-' || gen_random_uuid(),
  'admin@example.com',
  -- 密码需要使用 bcrypt 加密，这里是 'admin123' 的哈希值
  '$2b$10$rBV2kHXJL/vqHQPFpEZFp.XpCEjl/3GQN8YvH8ykHQMW0pFX0E8W2',
  'Admin User',
  NOW()
);
```

## 🎨 使用 Prisma Studio

Prisma Studio 是一个可视化的数据库管理工具：

```bash
cd backend
npx prisma studio
```

然后访问 http://localhost:5555 查看和编辑数据。

## 📚 更多资源

- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs)
- [项目 README](./README.md)
