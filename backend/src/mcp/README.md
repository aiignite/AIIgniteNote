# AI Ignite Note MCP Server

提供笔记管理的 MCP (Model Context Protocol) 接口，允许外部 AI 客户端（如 Claude Desktop、VS Code GitHub Copilot、Cursor 等）通过用户名密码认证来操作 AI Ignite Note 的笔记系统。

## 安全设计

- **不直接访问数据库**：通过后端 HTTP API 进行所有操作
- **用户名密码认证**：使用已有的登录接口获取 JWT Token
- **Token 自动管理**：缓存 Token 50 分钟，过期自动重新登录
- **权限隔离**：只能操作登录用户自己的笔记和文件夹

## 功能概览

| 工具 | 说明 | 操作类型 |
|------|------|----------|
| `note_create` | 创建新笔记（支持 4 种类型） | 写入 |
| `note_read` | 读取笔记完整内容 | 只读 |
| `note_update` | 更新笔记标题/内容/标签等 | 写入 |
| `note_delete` | 删除笔记（软删除/永久删除） | 破坏性 |
| `note_list` | 列出笔记（分页/筛选/排序） | 只读 |
| `note_restore` | 从回收站恢复笔记 | 写入 |
| `note_toggle_favorite` | 切换笔记收藏状态 | 写入 |
| `note_search` | 搜索笔记标题和内容 | 只读 |
| `folder_list` | 列出文件夹树 | 只读 |
| `folder_create` | 创建文件夹 | 写入 |
| `folder_delete` | 删除文件夹 | 破坏性 |

## 支持的笔记类型

- **MARKDOWN** - Markdown 格式笔记（默认）
- **RICHTEXT** - 富文本笔记（TipTap JSON 格式）
- **MINDMAP** - 思维导图笔记（JSON 结构）
- **FLOWCHART** - 流程图笔记（Mermaid 或 JSON 格式）

## 快速开始

### 前置要求

1. AI Ignite Note 后端服务已启动（默认端口 3215）
2. 拥有一个已注册的用户账号（邮箱 + 密码）

### 构建

```bash
cd backend/src/mcp
npm install
npm run build
```

### 测试运行

```bash
cd backend/src/mcp
MCP_USER_EMAIL="your-email@example.com" MCP_USER_PASSWORD="your-password" npm start
```

## 环境变量

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `MCP_USER_EMAIL` | 登录邮箱 | ✅ 是 | - |
| `MCP_USER_PASSWORD` | 登录密码 | ✅ 是 | - |
| `MCP_API_URL` | 后端 API 地址 | 否 | `http://localhost:3215/api` |

## 客户端配置

### Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aiignitenote": {
      "command": "node",
      "args": ["/path/to/AIIgniteNote/backend/src/mcp/dist/index.js"],
      "env": {
        "MCP_USER_EMAIL": "your-email@example.com",
        "MCP_USER_PASSWORD": "your-password",
        "MCP_API_URL": "http://localhost:3215/api"
      }
    }
  }
}
```

### VS Code GitHub Copilot

在项目根目录创建 `.vscode/mcp.json`：

```json
{
  "servers": {
    "aiignitenote": {
      "command": "node",
      "args": ["${workspaceFolder}/backend/src/mcp/dist/index.js"],
      "env": {
        "MCP_USER_EMAIL": "your-email@example.com",
        "MCP_USER_PASSWORD": "your-password",
        "MCP_API_URL": "http://localhost:3215/api"
      }
    }
  }
}
```

或在用户 `settings.json` 中添加:

```json
{
  "mcp": {
    "servers": {
      "aiignitenote": {
        "command": "node",
        "args": ["/path/to/AIIgniteNote/backend/src/mcp/dist/index.js"],
        "env": {
          "MCP_USER_EMAIL": "your-email@example.com",
          "MCP_USER_PASSWORD": "your-password",
          "MCP_API_URL": "http://localhost:3215/api"
        }
      }
    }
  }
}
```

### Cursor

编辑 `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aiignitenote": {
      "command": "node",
      "args": ["/path/to/AIIgniteNote/backend/src/mcp/dist/index.js"],
      "env": {
        "MCP_USER_EMAIL": "your-email@example.com",
        "MCP_USER_PASSWORD": "your-password",
        "MCP_API_URL": "http://localhost:3215/api"
      }
    }
  }
}
```

### 也可使用 tsx 直接运行（开发模式）

将 `"command"` 和 `"args"` 改为：

```json
{
  "command": "npx",
  "args": ["tsx", "/path/to/AIIgniteNote/backend/src/mcp/index.ts"]
}
```

## 使用示例

以下展示 AI 客户端如何使用这些工具：

### 1. 创建一篇 Markdown 笔记

```
请帮我创建一篇关于 "React Hooks 最佳实践" 的 Markdown 笔记，内容包括 useState、useEffect 和 useMemo 的使用要点。
```

AI 会调用 `note_create`:
```json
{
  "title": "React Hooks 最佳实践",
  "content": "# React Hooks 最佳实践\n\n## useState\n- 使用函数式更新...\n\n## useEffect\n- 正确设置依赖数组...\n\n## useMemo\n- 避免不必要的重计算...",
  "noteType": "MARKDOWN",
  "tags": ["React", "前端", "最佳实践"]
}
```

### 2. 创建思维导图笔记

```
帮我创建一个关于 "项目管理" 的思维导图笔记。
```

AI 会调用 `note_create`:
```json
{
  "title": "项目管理思维导图",
  "content": "{\"root\":{\"text\":\"项目管理\",\"children\":[{\"text\":\"计划\"},{\"text\":\"执行\"},{\"text\":\"监控\"},{\"text\":\"收尾\"}]}}",
  "noteType": "MINDMAP"
}
```

### 3. 搜索并更新笔记

```
找到我关于 React 的笔记，在里面补充 useCallback 的内容。
```

AI 会先调用 `note_search` 搜索，然后调用 `note_read` 读取内容，最后调用 `note_update` 更新。

### 4. 整理笔记到文件夹

```
创建一个 "学习资料" 文件夹，然后把关于 React 的笔记移到这个文件夹里。
```

AI 会依次调用 `folder_create` -> `note_search` -> `note_update`。

### 5. 批量创建系列笔记

```
帮我创建一个 "TypeScript 入门" 系列，包括 5 篇笔记：基础类型、接口、泛型、装饰器、工具类型。
```

AI 会创建文件夹后连续调用 5 次 `note_create`。

## 架构说明

```
backend/src/mcp/
├── index.ts              # 入口文件，MCP Server 初始化 + dotenv 配置
├── package.json          # 独立的包配置
├── tsconfig.json         # TypeScript 配置
├── services/
│   └── api-client.ts     # HTTP API 客户端（JWT 认证 + 自动重试）
├── tools/
│   ├── notes.ts          # 笔记 CRUD 工具（7 个）
│   ├── folders.ts        # 文件夹管理工具（3 个）
│   └── search.ts         # 搜索和列表工具（2 个）  [注: 上一版本有误，实际应为1个]
└── dist/                 # 编译输出
```

### 设计要点

1. **HTTP API 认证**: 通过用户名密码登录获取 JWT Token，安全且无需暴露数据库信息
2. **Token 自动管理**: 缓存 Token 并自动续期，401 错误时自动重新登录
3. **stdio 传输**: 使用标准输入输出通信，兼容所有 MCP 客户端
4. **完整的错误处理**: 每个工具都有 try/catch，返回友好的中文错误信息
5. **结构化输出**: 同时返回 Markdown 文本和 JSON 结构化数据 (`structuredContent`)
6. **权限安全**: 所有操作都在登录用户的权限范围内，不会越权

## 故障排除

### 登录失败

确保密码正确且后端服务已启动：

```bash
# 测试登录
curl -X POST http://localhost:3215/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### 后端服务未启动

```bash
# 启动后端
cd /path/to/AIIgniteNote
bash start.sh
# 或手动启动
cd backend && npm run dev
```

### MCP Server 无响应

检查 `stderr` 输出（MCP 使用 stdout 通信，日志在 stderr）:

```bash
MCP_USER_EMAIL="your@email.com" MCP_USER_PASSWORD="pwd" node dist/index.js 2>mcp.log
cat mcp.log
```
