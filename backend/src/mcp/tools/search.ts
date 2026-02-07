/**
 * 搜索和笔记列表工具
 * 
 * 通过 HTTP API 提供笔记的搜索、列表和统计功能。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../services/api-client.js';

export function registerSearchTools(server: McpServer): void {
  // ============================
  // 笔记列表
  // ============================
  server.registerTool(
    'note_list',
    {
      title: '笔记列表',
      description: `获取笔记列表，支持分页、搜索、按文件夹筛选、排序等。也可用于查看回收站。

参数说明:
- search: 关键词搜索（搜索标题和内容）
- folderId: 按文件夹筛选
- isDeleted: true 查看回收站，false 查看正常笔记
- isFavorite: true 只看收藏笔记
- page/limit: 分页参数
- sortBy: 排序字段（updatedAt, createdAt, title）
- sortOrder: 排序方向（asc, desc）`,
      inputSchema: {
        search: z.string().optional().describe('搜索关键词，匹配标题和内容'),
        folderId: z.string().optional().describe('文件夹 ID，筛选该文件夹下的笔记'),
        isDeleted: z.boolean().default(false).describe('是否查看回收站（已删除的笔记）'),
        isFavorite: z.boolean().optional().describe('是否只看收藏笔记'),
        page: z.number().int().positive().default(1).describe('页码，从 1 开始'),
        limit: z.number().int().min(1).max(100).default(20).describe('每页数量，默认 20'),
        sortBy: z.enum(['updatedAt', 'createdAt', 'title']).default('updatedAt').describe('排序字段'),
        sortOrder: z.enum(['asc', 'desc']).default('desc').describe('排序方向'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          page: String(params.page),
          limit: String(params.limit),
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          isDeleted: String(params.isDeleted),
        };
        if (params.search) queryParams.search = params.search;
        if (params.folderId) queryParams.folderId = params.folderId;
        if (params.isFavorite !== undefined) queryParams.isFavorite = String(params.isFavorite);

        const result = await apiRequest('GET', '/notes', undefined, queryParams);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `获取笔记列表失败: ${result.error?.message || '未知错误'}` }],
          };
        }

        const notes = result.data || [];
        const meta = result.meta?.pagination || {};

        if (notes.length === 0) {
          const ctx = params.search ? `搜索 "${params.search}" 无结果` : 
                      params.isDeleted ? '回收站为空' : '暂无笔记';
          return {
            content: [{ type: 'text' as const, text: ctx }],
            structuredContent: { notes: [], meta },
          };
        }

        const noteLines = notes.map((n: any, i: number) => {
          const fav = n.isFavorite ? '⭐ ' : '';
          const folder = n.folder?.name ? ` [${n.folder.name}]` : '';
          const tags = (n.tags || []).map((t: any) => t.tag?.name || t.name || t).join(', ');
          const tagStr = tags ? ` 🏷️${tags}` : '';
          return `${i + 1}. ${fav}**${n.title}** (${n.type})${folder}${tagStr}\n   ID: ${n.id} | 更新: ${n.updatedAt}`;
        }).join('\n');

        const text = `# 笔记列表\n\n` +
          `共 ${meta.total || notes.length} 篇，第 ${meta.page || params.page} 页\n\n` +
          noteLines;

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: {
            notes: notes.map((n: any) => ({
              id: n.id,
              title: n.title,
              type: n.type,
              isFavorite: n.isFavorite,
              folderId: n.folderId,
              folderName: n.folder?.name,
              updatedAt: n.updatedAt,
            })),
            meta,
          },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `获取笔记列表失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 笔记搜索
  // ============================
  server.registerTool(
    'note_search',
    {
      title: '搜索笔记',
      description: `按关键词搜索笔记的标题和内容。是 note_list 的快捷方式，专注于搜索场景。`,
      inputSchema: {
        keyword: z.string().min(1).describe('搜索关键词'),
        limit: z.number().int().min(1).max(50).default(10).describe('返回数量，默认 10'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          search: params.keyword,
          limit: String(params.limit),
          page: '1',
          isDeleted: 'false',
        };

        const result = await apiRequest('GET', '/notes', undefined, queryParams);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `搜索失败: ${result.error?.message || '未知错误'}` }],
          };
        }

        const notes = result.data || [];
        if (notes.length === 0) {
          return {
            content: [{ type: 'text' as const, text: `🔍 搜索 "${params.keyword}" 无结果` }],
            structuredContent: { keyword: params.keyword, results: [] },
          };
        }

        const lines = notes.map((n: any, i: number) => 
          `${i + 1}. **${n.title}** (${n.type}) [ID: ${n.id}]`
        ).join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `🔍 搜索 "${params.keyword}" 找到 ${notes.length} 个结果:\n\n${lines}`,
          }],
          structuredContent: {
            keyword: params.keyword,
            results: notes.map((n: any) => ({ id: n.id, title: n.title, type: n.type })),
          },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `搜索失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
