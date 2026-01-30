# AI助手功能测试指南

## 系统要求

- 后端服务运行在 `http://localhost:4000`
- 前端应用运行在 `http://localhost:3200`
- PostgreSQL数据库已连接
- 至少配置一个AI提供商的API密钥

## 快速开始

### 1. 配置AI提供商

编辑 `backend/.env` 文件，添加至少一个AI提供商的API密钥：

```bash
# 选项1: Google Gemini
GOOGLE_AI_API_KEY=your-gemini-api-key

# 选项2: Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# 选项3: OpenAI
OPENAI_API_KEY=your-openai-api-key

# 选项4: Ollama (本地，无需密钥)
OLLAMA_API_URL=http://localhost:11434

# 选项5: LM Studio (本地，无需密钥)
LM_STUDIO_API_URL=http://localhost:1234
```

### 2. 重启后端服务

```bash
cd backend
npm run dev
```

### 3. 启动前端应用

```bash
npm run dev
```

## 测试场景

### 场景1: 基本聊天功能

**步骤**:
1. 打开前端应用 (http://localhost:3200)
2. 登录或注册新账户
3. 点击右侧的AI助手面板
4. 在消息输入框中输入: "你好，请介绍一下你自己"
5. 按Enter或点击发送按钮

**预期结果**:
- ✅ 消息出现在聊天窗口
- ✅ AI助手返回响应
- ✅ 响应显示打字效果
- ✅ 对话保存到数据库

### 场景2: 切换AI提供商

**步骤**:
1. 在AIPanel中，点击提供商下拉菜单
2. 选择不同的AI提供商 (如果已配置)
3. 选择该提供商的模型
4. 发送新消息

**预期结果**:
- ✅ 提供商成功切换
- ✅ 模型列表更新
- ✅ 新消息使用选中的提供商
- ✅ 对话中显示使用的提供商和模型

### 场景3: 对话历史

**步骤**:
1. 发送多条消息创建对话
2. 点击"New Chat"按钮创建新对话
3. 发送新消息
4. 刷新页面
5. 检查对话历史是否恢复

**预期结果**:
- ✅ 对话历史在侧边栏显示
- ✅ 可以切换不同的对话
- ✅ 刷新后对话历史保持
- ✅ 消息历史正确加载

### 场景4: AI仪表板

**步骤**:
1. 点击主界面的"AI Dashboard"或相关按钮
2. 查看"Models"标签页
3. 查看"Assistants"标签页
4. 查看"Chat"标签页

**预期结果**:
- ✅ Models标签显示所有可用模型
- ✅ Assistants标签显示预定义的助手
- ✅ Chat标签显示对话界面
- ✅ 所有数据从后端正确加载

### 场景5: 选择不同的助手

**步骤**:
1. 在AIPanel中，点击当前助手名称
2. 从下拉菜单选择不同的助手
3. 发送消息

**预期结果**:
- ✅ 助手成功切换
- ✅ 系统消息更新为新助手的角色
- ✅ AI响应反映新助手的专长

### 场景6: 快速操作

**步骤**:
1. 在AIPanel的"Quick Actions"部分
2. 点击"Summarize action items"
3. 观察输入框是否填充了相应的提示

**预期结果**:
- ✅ 快速操作按钮可点击
- ✅ 输入框填充相应的提示文本
- ✅ 可以发送快速操作请求

## API测试

### 测试1: 获取可用提供商

```bash
# 1. 注册用户
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Password123",
    "username":"testuser"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')

# 2. 获取提供商列表
curl -s -X GET http://localhost:4000/api/ai/providers \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "GEMINI",
        "requiresApiKey": true,
        "defaultModel": "gemini-pro"
      },
      ...
    ],
    "userConfigured": {
      "gemini": false,
      "anthropic": false,
      "openai": true,
      ...
    }
  }
}
```

### 测试2: 发送AI聊天请求

```bash
# 使用上面获取的TOKEN

curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "OPENAI",
    "model": "gpt-4-turbo-preview",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }' | jq .
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "content": "AI response here...",
    "provider": "OPENAI",
    "model": "gpt-4-turbo-preview",
    "conversationId": "...",
    "usage": {
      "promptTokens": 10,
      "completionTokens": 50,
      "totalTokens": 60
    }
  }
}
```

### 测试3: 获取对话历史

```bash
curl -s -X GET http://localhost:4000/api/ai/conversations \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "title": "First message...",
      "provider": "OPENAI",
      "model": "gpt-4-turbo-preview",
      "createdAt": "2026-01-21T00:00:00.000Z",
      "updatedAt": "2026-01-21T00:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 测试4: 获取单个对话

```bash
CONVERSATION_ID="..." # 从上面的响应获取

curl -s -X GET http://localhost:4000/api/ai/conversations/$CONVERSATION_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "title": "...",
    "provider": "OPENAI",
    "model": "gpt-4-turbo-preview",
    "messages": [
      {
        "id": "...",
        "conversationId": "...",
        "role": "user",
        "content": "Hello!",
        "tokens": 10,
        "createdAt": "2026-01-21T00:00:00.000Z"
      },
      {
        "id": "...",
        "conversationId": "...",
        "role": "assistant",
        "content": "AI response...",
        "tokens": 50,
        "createdAt": "2026-01-21T00:00:00.000Z"
      }
    ]
  }
}
```

## 故障排除

### 问题1: "AI provider is not available"

**原因**: 选中的AI提供商没有配置API密钥或服务不可用

**解决方案**:
1. 检查 `backend/.env` 中是否配置了API密钥
2. 验证API密钥是否有效
3. 对于本地提供商，确保服务正在运行
4. 重启后端服务

### 问题2: 对话未保存

**原因**: 数据库连接问题或认证失败

**解决方案**:
1. 检查数据库连接: `DATABASE_URL` 是否正确
2. 确保用户已认证
3. 查看后端日志: `tail -f backend/logs/error.log`
4. 重启后端服务

### 问题3: 前端无法连接到后端

**原因**: CORS配置或后端未运行

**解决方案**:
1. 确保后端运行在 `http://localhost:4000`
2. 检查 `backend/.env` 中的 `CORS_ORIGIN` 配置
3. 确保前端运行在 `http://localhost:3200`
4. 检查浏览器控制台的CORS错误

### 问题4: Token过期

**原因**: 认证token已过期

**解决方案**:
1. 刷新页面重新登录
2. 检查 `JWT_ACCESS_EXPIRY` 配置
3. 确保token刷新机制正常工作

## 性能测试

### 测试大量消息

```bash
# 发送100条消息
for i in {1..100}; do
  curl -s -X POST http://localhost:4000/api/ai/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"provider\": \"OPENAI\",
      \"messages\": [{\"role\": \"user\", \"content\": \"Message $i\"}]
    }" > /dev/null
  echo "Sent message $i"
done
```

**预期结果**:
- ✅ 所有消息成功发送
- ✅ 响应时间在可接受范围内
- ✅ 数据库性能稳定

## 检查清单

在部署到生产环境前，请确保：

- [ ] 至少配置了一个AI提供商的API密钥
- [ ] 后端服务正常运行
- [ ] 前端应用正常运行
- [ ] 数据库连接正常
- [ ] 所有API端点都可访问
- [ ] 对话历史正确保存
- [ ] 错误处理正常工作
- [ ] 性能测试通过
- [ ] 安全配置正确（JWT密钥等）

## 总结

通过以上测试，您可以验证AI助手功能是否正常工作。如果所有测试都通过，系统已准备好用于生产环境。

如有任何问题，请查看后端日志或浏览器控制台获取更多信息。
