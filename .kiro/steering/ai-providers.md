# AI提供商集成指南

## 支持的AI提供商

AI Ignite Note支持以下AI提供商：

### 1. Google Gemini
- **API类型**: 云端API
- **模型**: gemini-pro, gemini-pro-vision
- **配置**: 需要GEMINI_API_KEY
- **获取密钥**: https://makersuite.google.com/app/apikey

### 2. Anthropic Claude
- **API类型**: 云端API
- **模型**: claude-3-5-sonnet-20241022, claude-3-opus, claude-3-sonnet
- **配置**: 需要ANTHROPIC_API_KEY
- **获取密钥**: https://console.anthropic.com/

### 3. OpenAI
- **API类型**: 云端API
- **模型**: gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo
- **配置**: 需要OPENAI_API_KEY
- **获取密钥**: https://platform.openai.com/api-keys

### 4. Ollama
- **API类型**: 本地部署
- **模型**: llama2, mistral, codellama等
- **配置**: 需要OLLAMA_BASE_URL（默认: http://localhost:11434）
- **安装**: https://ollama.ai/

### 5. LM Studio
- **API类型**: 本地部署
- **模型**: 支持各种开源模型
- **配置**: 需要LMSTUDIO_BASE_URL（默认: http://localhost:1234）
- **下载**: https://lmstudio.ai/

## 环境变量配置

创建`.env`文件并配置以下变量：

```bash
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/aiignitenote

# JWT密钥
JWT_SECRET=your-secret-key-here

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Ollama（本地部署）
OLLAMA_BASE_URL=http://localhost:11434

# LM Studio（本地部署）
LMSTUDIO_BASE_URL=http://localhost:1234
```

## Docker环境配置

在Docker环境中，本地AI服务需要使用`host.docker.internal`：

```yaml
environment:
  - OLLAMA_BASE_URL=http://host.docker.internal:11434
  - LMSTUDIO_BASE_URL=http://host.docker.internal:1234
```

## 前端配置

用户可以在设置页面中：
1. 选择默认的AI提供商
2. 配置API密钥（仅存储在后端）
3. 选择默认模型
4. 配置本地AI服务URL

## API使用示例

```typescript
// 发送AI对话请求
POST /api/ai/chat
{
  "provider": "anthropic",  // gemini, anthropic, openai, ollama, lmstudio
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}

// 响应格式（统一）
{
  "success": true,
  "data": {
    "content": "Hello! How can I help you?",
    "model": "claude-3-5-sonnet-20241022",
    "provider": "anthropic",
    "tokens": {
      "prompt": 10,
      "completion": 20,
      "total": 30
    }
  }
}
```

## 提供商选择策略

系统按以下优先级选择AI提供商：
1. 用户在请求中指定的提供商
2. 用户设置中的默认提供商
3. 系统配置的默认提供商（Gemini）

## 错误处理

当AI提供商不可用时：
- 返回明确的错误信息
- 建议用户切换到其他提供商
- 记录错误日志用于监控