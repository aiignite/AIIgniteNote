#!/bin/bash

echo "=== 测试本地PostgreSQL数据库和API ==="
echo ""

echo "1. 测试健康检查..."
health=$(curl -s http://localhost:3215/health)
echo "$health" | jq '.'
echo ""

echo "2. 测试登录API..."
login=$(curl -s -X POST http://localhost:3215/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiignite.com","password":"Admin123456"}')
  
echo "$login" | jq '.success, .data.user | {email, name, role}'
TOKEN=$(echo "$login" | jq -r '.data.accessToken')
echo "Token: ${TOKEN:0:50}..."
echo ""

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登录失败，停止测试"
  exit 1
fi

echo "3. 测试获取用户信息..."
curl -s http://localhost:3215/api/users/me \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data | {id, email, name}'
echo ""

echo "4. 测试获取笔记列表..."
curl -s http://localhost:3215/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data | length'
echo ""

echo "5. 测试数据库连接..."
PGPASSWORD=postgres psql -U postgres -d ai_ignite_note -c "SELECT COUNT(*) as user_count FROM \"User\";"
echo ""

echo "6. 测试AI提供商列表..."
curl -s http://localhost:3215/api/ai/providers \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data | map(.provider)'
echo ""

echo "✅ 所有测试完成!"
