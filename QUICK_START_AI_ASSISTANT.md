# AI助手功能快速开始指南

## 概述

AI Ignite Note现在拥有完整的AI助手功能，支持多个AI提供商（Google Gemini、Anthropic Claude、OpenAI、Ollama、LM Studio）。所有对话都会自动保存到数据库。

## 系统状态

✅ **后端**: 运行在 `http://localhost:4000`
✅ **前端**: 运行在 `http://localhost:3200`
✅ **数据库**: PostgreSQL 已连接
✅ **API**: 所有端点已实现

## 快速开始（5分钟）

### 步骤1: 配置AI提供商（可选）

编辑 `backend/.env` 文件，添加至少一个AI提供商的API密钥：

```bash
# 选择以下任意一个或多个

# Google Gemini
GOOGLE_AI_API_KEY=your-gemini-api-key

# Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Ollama (本地，无需密钥)
OLLAMA_API_URL=http://localhost:11434

# LM Studio (本地，无需密钥)
LM_STUDIO_API_URL=http://localhost:1234
```

### 步骤2: 重启后端服务

```bash
cd backend
npm run dev
```

### 步骤3: 启动前端应用

```bash
npm run dev
```

### 步骤4: 使用AI助手

1. 打开 `http://localhost:3200`
2. 登录或注册账户
3. 点击右侧的AI助手面板
4. 选择AI提供商和模型
5. 输入消息并发送

## 主要功能

### 1. AI助手面板 (AIPanel)

位置: 应用右侧边栏

**功能**:
- 💬 实时聊天
- 🤖 选择AI提供商
- 🎯 选择AI模型
- 👤 选择助手角色
- 📝 快速操作按钮
- 💾 自动保存对话

**使用方法**:
1. 在顶部选择AI提供商
2. 选择该提供商的模型
3. 选择助手角色（代码架构师、文案编辑等）
4. 在输入框输入消息
5. 按Enter或点击发送按钮

### 2. AI仪表板 (AIDashboard)

位置: 主界面

**标签页**:
- **Models**: 显示所有可用的AI模型
- **Assistants**: 显示预定义的助手角色
- **Chat**: 主聊天界面

**功能**:
- 📊 查看可用模型
- 👥 查看助手列表
- 💬 进行对话
- 📜 查看对话历史

### 3. 对话历史

**自动保存**:
- 所有对话自动保存到数据库
- 刷新页面后对话历史保持
- 可以切换不同的对话

**管理**:
- 点击"New Chat"创建新对话
- 从侧边栏选择历史对话
- 对话按最近使用时间排序

## 支持的AI提供商

### 云端提供商

#### 1. Google Gemini
- **模型**: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash
- **获取密钥**: https://makersuite.google.com/app/apikey
- **配置**: `GOOGLE_AI_API_KEY=your-key`

#### 2. Anthropic Claude
- **模型**: claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-haiku-20240307
- **获取密钥**: https://console.anthropic.com/
- **配置**: `ANTHROPIC_API_KEY=your-key`

#### 3. OpenAI
- **模型**: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
- **获取密钥**: https://platform.openai.com/api-keys
- **配置**: `OPENAI_API_KEY=your-key`

### 本地提供商

#### 4. Ollama
- **模型**: llama3.2, mistral, codellama, phi3
- **安装**: https://ollama.ai/
- **配置**: `OLLAMA_API_URL=http://localhost:11434`
- **优点**: 无需API密钥，完全本地运行

#### 5. LM Studio
- **模型**: 支持各种开源模型
- **下载**: https://lmstudio.ai/
- **配置**: `LM_STUDIO_API_URL=http://localhost:1234`
- **优点**: 用户友好的界面，支持多种模型

## 常见任务

### 任务1: 使用特定提供商

1. 在AIPanel中点击提供商下拉菜单
2. 选择所需的提供商
3. 选择该提供商的模型
4. 发送消息

### 任务2: 切换助手角色

1. 点击当前助手名称
2. 从下拉菜单选择新助手
3. 系统会显示助手切换的确认消息
4. 继续聊天

### 任务3: 使用快速操作

1. 在AIPanel的"Quick Actions"部分
2. 点击相应的快速操作按钮
3. 输入框会自动填充相应的提示
4. 发送消息

### 任务4: 查看对话历史

1. 在AIPanel的左侧边栏
2. 查看"Recent Conversations"列表
3. 点击任何对话以加载它
4. 消息历史会自动加载

### 任务5: 创建新对话

1. 点击"New Chat"按钮
2. 消息历史会清空
3. 开始新的对话
4. 新对话会自动保存

## 故障排除

### 问题: "AI provider is not available"

**原因**: 选中的提供商没有配置或不可用

**解决方案**:
1. 检查 `backend/.env` 中是否配置了API密钥
2. 对于本地提供商，确保服务正在运行
3. 重启后端服务
4. 选择其他可用的提供商

### 问题: 对话未保存

**原因**: 数据库连接问题

**解决方案**:
1. 检查数据库是否运行
2. 查看后端日志
3. 重启后端服务

### 问题: 前端无法连接到后端

**原因**: 后端未运行或CORS配置问题

**解决方案**:
1. 确保后端运行在 `http://localhost:4000`
2. 检查浏览器控制台的错误
3. 重启后端服务

### 问题: 消息发送失败

**原因**: 认证失败或API错误

**解决方案**:
1. 刷新页面重新登录
2. 检查浏览器控制台的错误信息
3. 查看后端日志

## 性能提示

1. **使用本地提供商**: 如果可能，使用Ollama或LM Studio以获得更快的响应
2. **选择合适的模型**: 较小的模型更快但准确度可能较低
3. **管理对话**: 定期删除旧对话以保持数据库性能
4. **批量操作**: 避免同时发送大量请求

## 安全建议

1. **保护API密钥**: 不要在代码中硬编码API密钥
2. **使用环境变量**: 在 `.env` 文件中配置敏感信息
3. **定期更新**: 保持依赖包最新
4. **监控使用**: 监控API使用情况以防止滥用

## 高级配置

### 自定义模型

编辑 `components/AIDashboard.tsx` 中的 `modelDescriptions` 对象来添加自定义模型描述。

### 自定义助手

编辑 `components/AIPanel.tsx` 中的 `ASSISTANTS` 数组来添加自定义助手。

### 自定义快速操作

编辑 `components/AIPanel.tsx` 中的 `smartActions` 数组来添加自定义快速操作。

## API文档

### 获取可用提供商

```bash
GET /api/ai/providers
Authorization: Bearer {token}
```

### 发送聊天消息

```bash
POST /api/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "OPENAI",
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

### 获取对话历史

```bash
GET /api/ai/conversations
Authorization: Bearer {token}
```

### 获取单个对话

```bash
GET /api/ai/conversations/{conversationId}
Authorization: Bearer {token}
```

### 删除对话

```bash
DELETE /api/ai/conversations/{conversationId}
Authorization: Bearer {token}
```

## 更多资源

- **实现文档**: 查看 `AI_ASSISTANT_IMPLEMENTATION.md`
- **测试指南**: 查看 `AI_ASSISTANT_TESTING_GUIDE.md`
- **完整总结**: 查看 `AI_IMPLEMENTATION_SUMMARY.md`

## 支持

如有任何问题或建议，请：

1. 查看后端日志: `tail -f backend/logs/error.log`
2. 查看浏览器控制台: F12 → Console
3. 检查API响应: F12 → Network
4. 查看相关文档

## 总结

AI助手功能现已完全集成到AI Ignite Note中。您可以：

✅ 使用多个AI提供商
✅ 自动保存对话历史
✅ 切换不同的助手角色
✅ 使用快速操作按钮
✅ 管理对话历史

系统已准备好用于生产环境。祝您使用愉快！
