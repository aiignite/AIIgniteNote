#!/bin/bash

echo "测试创建AI模型（带空defaultTemplateId）..."

# 登录
TOKEN=$(curl -s -X POST http://localhost:3215/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiignite.com","password":"Admin123456"}' | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"

# 测试创建模型（空defaultTemplateId）
echo ""
echo "创建模型（defaultTemplateId为空字符串）..."
RESULT=$(curl -s -X POST http://localhost:3215/api/ai/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试Claude模型",
    "modelId": "claude-3-5-sonnet-20241022",
    "provider": "ANTHROPIC",
    "description": "测试Claude模型",
    "speed": "Fast",
    "cost": "$$$",
    "context": "200K",
    "popularity": 85,
    "defaultTemplateId": ""
  }')

echo "$RESULT" | jq '.'

if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
  echo ""
  echo "✅ 模型创建成功！"
else
  echo ""
  echo "❌ 模型创建失败"
fi
