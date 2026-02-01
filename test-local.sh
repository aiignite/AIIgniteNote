#!/bin/bash

echo "========================================="
echo "测试本地环境 (PostgreSQL + 本地编译)"
echo "========================================="
echo ""

# 后端健康检查
echo "1. 测试后端健康状态..."
HEALTH=$(curl -s http://localhost:3215/health)
echo "$HEALTH" | jq '.'
echo ""

# 登录获取token
echo "2. 测试用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3215/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiignite.com","password":"Admin123456"}')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败，尝试创建管理员账户..."
  echo ""
  
  echo "3. 创建管理员账户..."
  REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3215/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@aiignite.com","password":"Admin123456","username":"admin"}')
  
  echo "$REGISTER_RESPONSE" | jq '.'
  
  # 重新登录
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3215/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@aiignite.com","password":"Admin123456"}')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
  echo ""
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 无法获取访问令牌"
  exit 1
fi

echo "✅ 成功获取访问令牌"
echo ""

# 测试笔记API
echo "4. 测试获取笔记列表..."
NOTES=$(curl -s http://localhost:3215/api/notes \
  -H "Authorization: Bearer $TOKEN")
echo "$NOTES" | jq '.'
echo ""

# 测试AI提供商列表
echo "5. 测试获取AI提供商列表..."
PROVIDERS=$(curl -s http://localhost:3215/api/ai/providers \
  -H "Authorization: Bearer $TOKEN")
echo "$PROVIDERS" | jq '.'
echo ""

# 测试模板列表
echo "6. 测试获取模板列表..."
TEMPLATES=$(curl -s http://localhost:3215/api/templates \
  -H "Authorization: Bearer $TOKEN")
echo "$TEMPLATES" | jq '.'
echo ""

echo "========================================="
echo "✅ 所有测试完成！"
echo "========================================="
echo ""
echo "服务信息:"
echo "  - 后端: http://localhost:3215"
echo "  - 前端: http://localhost:3210"
echo "  - 数据库: PostgreSQL (本地:5432)"
echo ""
