#!/bin/bash

# AI Ignite Note - Docker 测试脚本
# 用于构建和测试前端和后端

echo "================================"
echo "AI Ignite Note - Docker 测试"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 是否运行
echo "📋 检查 Docker 状态..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 运行中${NC}"
echo ""

# 停止并删除旧容器
echo "🧹 清理旧容器..."
docker-compose down -v
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 镜像构建成功${NC}"
echo ""

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 服务启动失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 服务启动成功${NC}"
echo ""

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 检查数据库健康状态
echo "🔍 检查数据库健康状态..."
docker-compose exec -T postgres pg_isready -U aiignite -d ai_ignite_note
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库就绪${NC}"
else
    echo -e "${YELLOW}⚠️  数据库未完全就绪，继续等待...${NC}"
    sleep 10
fi
echo ""

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
docker-compose exec -T backend npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库迁移成功${NC}"
else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    echo "查看后端日志："
    docker-compose logs backend
    exit 1
fi
echo ""

# 生成 Prisma Client
echo "⚙️  生成 Prisma Client..."
docker-compose exec -T backend npx prisma generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma Client 生成成功${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma Client 生成警告（可能已存在）${NC}"
fi
echo ""

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 检查服务状态..."
docker-compose ps

echo ""
echo "================================"
echo "🎉 测试环境准备完成！"
echo "================================"
echo ""
echo "📱 访问地址："
echo "   前端: http://localhost:3210"
echo "   后端: http://localhost:4000"
echo "   健康检查: http://localhost:4000/health"
echo ""
echo "📋 常用命令："
echo "   查看日志: docker-compose logs -f"
echo "   查看后端日志: docker-compose logs -f backend"
echo "   查看前端日志: docker-compose logs -f frontend"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo ""
echo "🧪 功能测试清单："
echo "   1. 注册/登录用户"
echo "   2. 创建根文件夹"
echo "   3. 创建子文件夹"
echo "   4. 查看文件夹树形结构"
echo "   5. 展开/收起文件夹"
echo "   6. 创建笔记"
echo "   7. 拖拽笔记到文件夹"
echo "   8. 使用文件夹选择器移动笔记"
echo "   9. 查看笔记标签显示"
echo "   10. 在不同文件夹间切换"
echo ""

# 询问是否查看实时日志
read -p "是否查看实时日志？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "按 Ctrl+C 退出日志查看"
    docker-compose logs -f
fi
