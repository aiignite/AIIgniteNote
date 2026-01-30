# AI Ignite Note - Docker 部署指南

本文档介绍如何使用Docker和Docker Compose部署AI Ignite Note应用。

## 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少一个AI提供商API密钥（Google Gemini、Anthropic Claude或OpenAI）

## 快速开始

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑.env文件，添加你的AI提供商API密钥
nano .env  # 或使用你喜欢的编辑器
```

**必需的配置**:
- 至少配置一个AI提供商API密钥（推荐Google Gemini，有免费额度）
- 生产环境请更改JWT_SECRET和JWT_REFRESH_SECRET

### 2. 启动应用

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 3. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 运行Prisma迁移
npx prisma migrate deploy

# 生成Prisma Client
npx prisma generate

# 退出容器
exit
```

### 4. 访问应用

- **前端**: http://localhost:3000
- **后端API**: http://localhost:4000/api
- **健康检查**: http://localhost:4000/health

首次访问时，需要注册一个新用户账户。

## 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                      │
│                         aiignitenet                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Frontend   │─────▶│    Nginx     │                │
│  │   (Node.js)  │      │   (Proxy)    │                │
│  │  Port: 3000  │      │              │                │
│  └──────────────┘      └──────┬───────┘                │
│                                │                         │
│                                ▼                         │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Backend    │◀─────│  PostgreSQL  │                │
│  │   (Express)  │      │  (Database)  │                │
│  │  Port: 4000  │      │  Port: 5432  │                │
│  └──────────────┘      └──────────────┘                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 数据持久化

应用使用Docker命名卷来持久化数据：

| 卷名称 | 用途 | 主机路径 |
|--------|------|----------|
| `postgres_data` | PostgreSQL数据库 | Docker managed |
| `backend_uploads` | 上传的文件 | Docker managed |
| `backend_logs` | 应用日志 | Docker managed |

查看卷：
```bash
docker volume ls | grep aiignite
```

备份卷：
```bash
# 备份数据库
docker run --rm \
  -v aiignitenote_postgres_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# 备份上传文件
docker run --rm \
  -v aiignitenote_backend_uploads:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/uploads_backup.tar.gz -C /data .
```

## AI提供商配置

### Google Gemini（推荐）

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建API密钥
3. 在`.env`文件中设置：
   ```
   GOOGLE_AI_API_KEY="your_api_key_here"
   ```

**可用模型**:
- `gemini-2.0-flash-exp`（最新，推荐）
- `gemini-1.5-pro`
- `gemini-1.5-flash`

### Anthropic Claude

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建API密钥
3. 在`.env`文件中设置：
   ```
   ANTHROPIC_API_KEY="your_api_key_here"
   ```

**可用模型**:
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet-20241022`
- `claude-3-haiku-20240307`

### OpenAI GPT

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 创建API密钥
3. 在`.env`文件中设置：
   ```
   OPENAI_API_KEY="your_api_key_here"
   ```

**可用模型**:
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`

### 本地AI提供商（可选）

#### Ollama

1. 安装Ollama: https://ollama.ai/
2. 启动服务: `ollama serve`
3. 在`.env`中配置：
   ```
   OLLAMA_API_URL="http://host.docker.internal:11434"
   ```
4. 拉取模型: `ollama pull llama3.2`

#### LM Studio

1. 安装LM Studio: https://lmstudio.ai/
2. 启动应用并启用API服务器
3. 在`.env`中配置：
   ```
   LM_STUDIO_API_URL="http://host.docker.internal:1234"
   ```

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除所有数据（警告：会删除数据库数据）
docker-compose down -v

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs

# 跟踪日志
docker-compose logs -f

# 查看最近100行日志
docker-compose logs --tail=100

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 容器操作

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec postgres psql -U aiignite -d ai_ignite_note

# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build
```

### 数据库操作

```bash
# 连接到PostgreSQL
docker-compose exec postgres psql -U aiignite -d ai_ignite_note

# 备份数据库
docker-compose exec postgres pg_dump -U aiignite ai_ignite_note > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T postgres psql -U aiignite -d ai_ignite_note
```

## 故障排除

### 问题：容器启动失败

**解决方案**：
```bash
# 查看详细日志
docker-compose logs backend

# 检查端口占用
netstat -tuln | grep -E "3000|4000|5432"

# 重建容器
docker-compose down
docker-compose up -d --build
```

### 问题：数据库连接失败

**解决方案**：
```bash
# 检查PostgreSQL是否健康
docker-compose ps postgres

# 等待数据库完全启动
docker-compose up -d postgres
# 等待30秒后启动其他服务
docker-compose up -d backend frontend
```

### 问题：本地AI服务无法连接

**解决方案**：
```bash
# 确认本地AI服务正在运行
curl http://localhost:11434/api/tags  # Ollama
curl http://localhost:1234/v1/models   # LM Studio

# 在Docker中使用host.docker.internal
docker-compose exec backend curl http://host.docker.internal:11434/api/tags
```

### 问题：前端无法连接后端

**解决方案**：
```bash
# 检查网络
docker network inspect aiignitenote_aiignitenet

# 检查CORS设置
docker-compose exec backend env | grep CORS_ORIGIN

# 重启nginx
docker-compose restart frontend
```

## 生产部署建议

### 1. 安全性

```bash
# 生成安全的JWT密钥
openssl rand -base64 32

# 更新.env文件
JWT_SECRET="<生成的密钥>"
JWT_REFRESH_SECRET="<生成的另一个密钥>"

# 更改默认数据库密码
POSTGRES_PASSWORD="<强密码>"
```

### 2. 性能优化

```yaml
# 在docker-compose.yml中添加资源限制
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. 监控

```bash
# 查看容器资源使用
docker stats

# 设置健康检查通知
# （需要额外的监控工具如Prometheus/Grafana）
```

### 4. 备份策略

```bash
# 创建定期备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm \
  -v aiignitenote_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_$DATE.tar.gz -C /data .
EOF

chmod +x backup.sh

# 添加到crontab
# 0 2 * * * /path/to/backup.sh
```

## 升级

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build

# 运行数据库迁移
docker-compose exec backend npx prisma migrate deploy
```

## 卸载

```bash
# 停止并删除所有容器、网络和卷
docker-compose down -v

# 删除镜像
docker rmi aiignitenote-backend aiignitenote-frontend
```

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/aiignite/AIIgniteNoteFrontend/issues
- 文档: https://github.com/aiignite/AIIgniteNoteFrontend/wiki
