#!/bin/bash

echo "========================================="
echo "本地环境启动和测试"
echo "========================================="
echo ""

# 检查PostgreSQL
echo "1. 检查PostgreSQL服务..."
if brew services list | grep -q "postgresql@14.*started"; then
  echo "✅ PostgreSQL已运行"
else
  echo "⚠️  启动PostgreSQL..."
  brew services start postgresql@14
  sleep 3
fi
echo ""

# 停止旧进程
echo "2. 清理旧进程..."
pkill -f "tsx watch src/app.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2
echo "✅ 清理完成"
echo ""

# 启动后端
echo "3. 启动后端服务 (端口3215)..."
cd /Users/wyh/Documents/AIIgnite/AIIgniteNote/backend
nohup npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端PID: $BACKEND_PID"
sleep 5
echo ""

# 检查后端
echo "4. 检查后端服务..."
if lsof -i :3215 >/dev/null 2>&1; then
  echo "✅ 后端服务运行中"
  curl -s http://localhost:3215/health | jq '.'
else
  echo "❌ 后端启动失败，查看日志:"
  tail -50 /tmp/backend.log
  exit 1
fi
echo ""

# 启动前端
echo "5. 启动前端服务 (端口3210)..."
cd /Users/wyh/Documents/AIIgnite/AIIgniteNote
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端PID: $FRONTEND_PID"
sleep 5
echo ""

# 检查前端
echo "6. 检查前端服务..."
if lsof -i :3210 >/dev/null 2>&1; then
  echo "✅ 前端服务运行中"
else
  echo "⚠️  前端可能在其他端口"
  tail -20 /tmp/frontend.log | grep "Local:"
fi
echo ""

echo "========================================="
echo "✅ 服务启动完成！"
echo "========================================="
echo ""
echo "服务信息:"
echo "  - 后端: http://localhost:3215"
echo "  - 前端: http://localhost:3210 (或查看上方输出)"
echo "  - 数据库: PostgreSQL@localhost:5432"
echo ""
echo "日志文件:"
echo "  - 后端: /tmp/backend.log"
echo "  - 前端: /tmp/frontend.log"
echo ""
echo "停止服务: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# 运行API测试
read -p "是否运行API测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  /Users/wyh/Documents/AIIgnite/AIIgniteNote/test-local.sh
fi
