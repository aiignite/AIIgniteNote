/**
 * 文件夹管理工具
 * 
 * 通过 HTTP API 提供文件夹的列表、创建、删除操作。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../services/api-client.js';

export function registerFolderTools(server: McpServer): void {
  // ============================
  // 列出文件夹
  // ============================
  server.registerTool(
    'folder_list',
    {
      title: '列出文件夹',
      description: `获取用户的文件夹列表（树形结构），包含每个文件夹下的笔记数量。`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const result = await apiRequest('GET', '/folders');

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `获取文件夹失败: ${result.error?.message || '未知错误'}` }],
          };
        }

        const folders = result.data || [];

        if (folders.length === 0) {
          return {
            content: [{ type: 'text' as const, text: '📁 暂无文件夹' }],
            structuredContent: { folders: [] },
          };
        }

        const formatFolder = (folder: any, indent: number = 0): string => {
          const prefix = '  '.repeat(indent);
          const noteCount = folder._count?.notes ?? folder.noteCount ?? 0;
          let line = `${prefix}📁 **${folder.name}** (${noteCount} 篇笔记) [ID: ${folder.id}]`;
          if (folder.children && folder.children.length > 0) {
            line += '\n' + folder.children.map((c: any) => formatFolder(c, indent + 1)).join('\n');
          }
          return line;
        };

        const text = `# 文件夹列表\n\n` + folders.map((f: any) => formatFolder(f)).join('\n');

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: { folders },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `获取文件夹失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 创建文件夹
  // ============================
  server.registerTool(
    'folder_create',
    {
      title: '创建文件夹',
      description: '创建一个新文件夹，可设置为另一个文件夹的子文件夹。',
      inputSchema: {
        name: z.string().min(1).max(100).describe('文件夹名称'),
        parentId: z.string().optional().describe('父文件夹 ID，不提供则创建在根级别'),
        icon: z.string().optional().describe('文件夹图标，如 emoji'),
        color: z.string().optional().describe('文件夹颜色，如 #FF5733'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const body: Record<string, any> = { name: params.name };
        if (params.parentId) body.parentId = params.parentId;
        if (params.icon) body.icon = params.icon;
        if (params.color) body.color = params.color;

        const result = await apiRequest('POST', '/folders', body);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `创建文件夹失败: ${result.error?.message || '未知错误'}` }],
          };
        }

        const folder = result.data;
        return {
          content: [{
            type: 'text' as const,
            text: `✅ 文件夹创建成功\n\n` +
              `- **ID**: ${folder.id}\n` +
              `- **名称**: ${folder.name}\n` +
              `- **父文件夹**: ${folder.parentId || '无（根级别）'}`,
          }],
          structuredContent: { id: folder.id, name: folder.name, parentId: folder.parentId },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `创建文件夹失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 删除文件夹
  // ============================
  server.registerTool(
    'folder_delete',
    {
      title: '删除文件夹',
      description: '删除指定文件夹。文件夹中的笔记和子文件夹将被移到根级别。',
      inputSchema: {
        folderId: z.string().min(1).describe('要删除的文件夹 ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await apiRequest('DELETE', `/folders/${params.folderId}`);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `删除文件夹失败: ${result.error?.message || '文件夹不存在或无权删除'}` }],
          };
        }
        return {
          content: [{ type: 'text' as const, text: `✅ 文件夹已删除（其中的笔记和子文件夹已移至根级别）` }],
          structuredContent: { id: params.folderId, action: 'deleted' },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `删除文件夹失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
