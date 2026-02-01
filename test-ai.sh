#!/bin/bash

echo "========================================="
echo "测试AI功能"
echo "========================================="
echo ""

# 登录获取token
echo "1. 登录获取Token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3215/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiignite.com","password":"Admin123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"
echo ""

# 获取assistants
echo "2. 获取AI助手列表..."
ASSISTANTS=$(curl -s http://localhost:3215/api/ai/assistants \
  -H "Authorization: Bearer $TOKEN")
echo "$ASSISTANTS" | jq '.data | length' | xargs echo "助手数量:"
echo "$ASSISTANTS" | jq '.data[] | {name: .name, category: .category}'
echo ""

# 创建测试模型
echo "3. 测试创建AI模型..."
CREATE_MODEL=$(curl -s -X POST http://localhost:3215/api/ai/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试GPT-4模型",
    "modelId": "gpt-4o",
    "provider": "OPENAI",
    "description": "用于测试的GPT-4模型",
    "speed": "Fast",
    "cost": "$$",
    "context": "128K",
    "popularity": 90
  }')

if echo "$CREATE_MODEL" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ 模型创建成功"
  echo "$CREATE_MODEL" | jq '.data | {id: .id, name: .name, modelId: .modelId}'
else
  echo "❌ 模型创建失败:"
  echo "$CREATE_MODEL" | jq '.'
fi
echo ""

# 获取models列表
echo "4. 获取模型列表..."
MODELS=$(curl -s http://localhost:3215/api/ai/models \
  -H "Authorization: Bearer $TOKEN")
echo "$MODELS" | jq '.data | length' | xargs echo "模型数量:"
echo ""

echo "========================================="
echo "✅ AI功能测试完成"
echo "========================================="
