#!/bin/bash

# ============================================================
# AI Ignite Note 本地数据库设置脚本
# ============================================================

set -e

echo "🚀 开始设置本地 PostgreSQL 数据库..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 数据库配置
DB_NAME="ai_ignite_note"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# ============================================================
# 步骤 1: 检查 PostgreSQL 是否安装
# ============================================================
echo -e "\n${YELLOW}步骤 1: 检查 PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL 未安装${NC}"
    echo -e "${YELLOW}请使用以下命令安装 PostgreSQL:${NC}"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL 已安装${NC}"

# ============================================================
# 步骤 2: 检查 PostgreSQL 服务是否运行
# ============================================================
echo -e "\n${YELLOW}步骤 2: 检查 PostgreSQL 服务...${NC}"

if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL 服务未运行${NC}"
    echo -e "${YELLOW}正在尝试启动服务...${NC}"
    brew services start postgresql@14 || brew services start postgresql
    sleep 3
    
    if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
        echo -e "${RED}❌ 无法启动 PostgreSQL 服务${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL 服务正在运行${NC}"

# ============================================================
# 步骤 3: 创建数据库
# ============================================================
echo -e "\n${YELLOW}步骤 3: 创建数据库...${NC}"

# 检查数据库是否已存在
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠️  数据库 '$DB_NAME' 已存在${NC}"
    read -p "是否删除并重新创建? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在删除旧数据库..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo "正在创建新数据库..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}✅ 数据库已重新创建${NC}"
    else
        echo -e "${YELLOW}⏭️  跳过数据库创建${NC}"
    fi
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ 数据库创建成功${NC}"
fi

# ============================================================
# 步骤 4: 导入数据库架构
# ============================================================
echo -e "\n${YELLOW}步骤 4: 导入数据库架构...${NC}"

if [ -f "ai-ignite-note.sql" ]; then
    echo "正在导入 SQL 文件..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ai-ignite-note.sql
    echo -e "${GREEN}✅ SQL 文件导入成功${NC}"
else
    echo -e "${YELLOW}⚠️  未找到 ai-ignite-note.sql 文件，将使用 Prisma 迁移${NC}"
fi

# ============================================================
# 步骤 5: 设置环境变量
# ============================================================
echo -e "\n${YELLOW}步骤 5: 配置环境变量...${NC}"

# 创建 backend/.env 文件
cat > backend/.env << EOF
# 数据库配置
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# 应用配置
NODE_ENV="development"
PORT="3000"

# CORS 配置
CORS_ORIGIN="http://localhost:5173"

# 文件上传配置
UPLOAD_DIR="uploads"
MAX_FILE_SIZE="10485760"

# AI 服务配置（可选）
OPENAI_API_KEY=""
GEMINI_API_KEY=""
EOF

echo -e "${GREEN}✅ 环境变量配置完成${NC}"

# ============================================================
# 步骤 6: 运行 Prisma 迁移
# ============================================================
echo -e "\n${YELLOW}步骤 6: 运行 Prisma 迁移...${NC}"

cd backend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install --registry=https://registry.npmmirror.com
fi

# 生成 Prisma Client
echo "正在生成 Prisma Client..."
npx prisma generate

# 应用迁移
echo "正在应用数据库迁移..."
npx prisma migrate deploy || npx prisma db push

echo -e "${GREEN}✅ Prisma 配置完成${NC}"

cd ..

# ============================================================
# 步骤 7: 验证数据库
# ============================================================
echo -e "\n${YELLOW}步骤 7: 验证数据库...${NC}"

# 检查表是否创建成功
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ 数据库表创建成功 (共 $TABLE_COUNT 个表)${NC}"
    echo -e "\n${YELLOW}数据库表列表:${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"
else
    echo -e "${RED}❌ 未找到数据库表${NC}"
fi

# ============================================================
# 完成
# ============================================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 数据库设置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n数据库信息:"
echo -e "  数据库名: ${GREEN}$DB_NAME${NC}"
echo -e "  主机: ${GREEN}$DB_HOST${NC}"
echo -e "  端口: ${GREEN}$DB_PORT${NC}"
echo -e "  用户: ${GREEN}$DB_USER${NC}"
echo -e "\n连接字符串:"
echo -e "  ${GREEN}postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo -e "\n下一步:"
echo -e "  1. 启动后端服务: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "  2. 启动前端服务: ${YELLOW}npm run dev${NC}"
echo -e "  3. 访问应用: ${YELLOW}http://localhost:5173${NC}"
echo -e "\n常用命令:"
echo -e "  查看数据库: ${YELLOW}psql -U $DB_USER -d $DB_NAME${NC}"
echo -e "  Prisma Studio: ${YELLOW}cd backend && npx prisma studio${NC}"
echo ""
