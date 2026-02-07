#!/usr/bin/env node
/**
 * AI Ignite Note MCP Server
 * 
 * 提供笔记管理的 MCP 工具，允许外部 AI 客户端（如 Claude Desktop、VS Code Copilot）
 * 创建、读取、更新、删除笔记，以及管理文件夹和搜索笔记。
 * 
 * 使用 stdio 传输协议，通过 HTTP API + JWT 认证访问后端服务。
 * 
 * 环境变量:
 *   MCP_USER_EMAIL    - 登录邮箱
 *   MCP_USER_PASSWORD - 登录密码
 *   MCP_API_URL       - 后端 API 地址（默认 http://localhost:3215/api）
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// 加载 .env 文件
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerNoteTools } from './tools/notes.js';
import { registerFolderTools } from './tools/folders.js';
import { registerSearchTools } from './tools/search.js';
import { checkConnection } from './services/api-client.js';

// 创建 MCP Server 实例
const server = new McpServer({
  name: 'aiignitenote-mcp-server',
  version: '1.0.0',
});

// 注册所有工具
registerNoteTools(server);
registerFolderTools(server);
registerSearchTools(server);

// 启动服务器
async function main() {
  try {
    // 验证认证配置（预登录获取 Token）
    await checkConnection();
    console.error('✅ 后端 API 连接成功');
  } catch (error) {
    console.error('⚠️ 后端 API 连接检查失败（工具调用时将重试）:', error instanceof Error ? error.message : String(error));
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Ignite Note MCP Server 已启动 (stdio 模式, HTTP API 认证)');
}

main().catch((error) => {
  console.error('MCP Server 启动失败:', error);
  process.exit(1);
});
