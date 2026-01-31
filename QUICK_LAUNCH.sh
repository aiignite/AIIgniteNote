#!/bin/bash

# 即时通讯系统快速启动脚本
# Usage: ./QUICK_LAUNCH.sh

set -e

PROJECT_DIR="/Users/wyh/Documents/AIIgnite/AIIgniteNote"
FRONTEND_URL="http://localhost:3210"
BACKEND_URL="http://localhost:3215"
DB_PORT="5434"

echo "🚀 即时通讯系统启动脚本"
echo "========================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Docker
echo -e "${BLUE}📦 检查 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已安装${NC}"

# 进入项目目录
cd "$PROJECT_DIR"

# 启动容器
echo ""
echo -e "${BLUE}🔧 启动 Docker 容器...${NC}"
docker-compose up -d

# 等待容器启动
echo ""
echo -e "${BLUE}⏳ 等待容器启动...${NC}"
sleep 5

# 检查容器状态
echo ""
echo -e "${BLUE}🏥 检查容器健康状态...${NC}"
if docker-compose ps | grep -q "healthy"; then
    echo -e "${GREEN}✅ 所有容器启动成功${NC}"
else
    echo -e "${YELLOW}⚠️  某些容器可能未完全启动，请稍候...${NC}"
fi

# 显示容器信息
echo ""
echo -e "${BLUE}📋 容器状态:${NC}"
docker-compose ps

# 显示访问信息
echo ""
echo -e "${GREEN}✅ 系统启动完成！${NC}"
echo ""
echo -e "${BLUE}访问地址:${NC}"
echo -e "  • 前端应用: ${GREEN}$FRONTEND_URL${NC}"
echo -e "  • 后端 API: ${GREEN}$BACKEND_URL${NC}"
echo -e "  • 数据库:   ${GREEN}localhost:$DB_PORT${NC}"
echo ""

# 显示快捷命令
echo -e "${BLUE}快捷命令:${NC}"
echo "  # 查看日志"
echo "  docker-compose logs -f backend"
echo ""
echo "  # 停止服务"
echo "  docker-compose down"
echo ""
echo "  # 重启服务"
echo "  docker-compose restart"
echo ""

# 尝试打开浏览器
echo -e "${BLUE}📂 打开浏览器...${NC}"
if command -v open &> /dev/null; then
    # macOS
    open "$FRONTEND_URL"
    echo -e "${GREEN}✅ 已在默认浏览器打开前端应用${NC}"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$FRONTEND_URL"
    echo -e "${GREEN}✅ 已在默认浏览器打开前端应用${NC}"
elif command -v start &> /dev/null; then
    # Windows
    start "$FRONTEND_URL"
    echo -e "${GREEN}✅ 已在默认浏览器打开前端应用${NC}"
else
    echo -e "${YELLOW}⚠️  请手动打开浏览器访问: $FRONTEND_URL${NC}"
fi

echo ""
echo -e "${GREEN}🎉 系统已就绪！开始使用即时通讯功能吧！${NC}"
echo ""
