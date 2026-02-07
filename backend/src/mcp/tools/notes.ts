/**
 * 笔记管理工具
 * 
 * 通过 HTTP API 提供笔记的创建、读取、更新、删除、收藏等完整 CRUD 操作。
 * 支持 MARKDOWN、RICHTEXT、MINDMAP、FLOWCHART 四种笔记类型。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../services/api-client.js';

const NoteTypeEnum = z.enum(['MARKDOWN', 'RICHTEXT', 'MINDMAP', 'FLOWCHART']);

export function registerNoteTools(server: McpServer): void {
  // ============================
  // 创建笔记
  // ============================
  server.registerTool(
    'note_create',
    {
      title: '创建笔记',
      description: `在 AI Ignite Note 中创建一个新笔记。

支持 4 种笔记类型:
- MARKDOWN: Markdown 格式笔记（默认）
- RICHTEXT: 富文本笔记（TipTap JSON 格式）
- MINDMAP: 思维导图笔记（JSON 结构）
- FLOWCHART: 流程图笔记（Mermaid 或 JSON 格式）

参数说明:
- title: 笔记标题
- content: 笔记内容（根据类型使用不同格式）
- noteType: 笔记类型，默认 MARKDOWN
- folderId: 可选，放入指定文件夹
- tags: 可选，标签名称数组

返回创建的笔记信息，包含 id、标题、类型、内容等。`,
      inputSchema: {
        title: z.string().min(1).max(200).describe('笔记标题'),
        content: z.string().describe('笔记内容。MARKDOWN 类型使用 Markdown 语法，RICHTEXT 使用 TipTap JSON，MINDMAP/FLOWCHART 使用 JSON 结构'),
        noteType: NoteTypeEnum.default('MARKDOWN').describe('笔记类型: MARKDOWN | RICHTEXT | MINDMAP | FLOWCHART'),
        folderId: z.string().optional().describe('文件夹 ID，将笔记放入指定文件夹'),
        tags: z.array(z.string()).optional().describe('标签名称数组，如 ["技术", "AI"]'),
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
        const body: Record<string, any> = {
          title: params.title,
          content: params.content,
          noteType: params.noteType,
        };
        if (params.folderId) body.folderId = params.folderId;
        if (params.tags && params.tags.length > 0) {
          body.tags = params.tags.map(name => ({ name }));
        }

        const result = await apiRequest('POST', '/notes', body);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `创建笔记失败: ${result.error?.message || '未知错误'}` }],
          };
        }

        const note = result.data;
        const output = {
          id: note.id,
          title: note.title,
          type: note.type,
          folderId: note.folderId,
          folderName: note.folder?.name || null,
          tags: (note.tags || []).map((t: any) => t.tag?.name || t.name || t),
          createdAt: note.createdAt,
        };

        return {
          content: [{
            type: 'text' as const,
            text: `✅ 笔记创建成功\n\n` +
              `- **ID**: ${output.id}\n` +
              `- **标题**: ${output.title}\n` +
              `- **类型**: ${output.type}\n` +
              `- **文件夹**: ${output.folderName || '无'}\n` +
              `- **标签**: ${output.tags.length > 0 ? output.tags.join(', ') : '无'}\n` +
              `- **创建时间**: ${output.createdAt}`,
          }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `创建笔记失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 读取笔记
  // ============================
  server.registerTool(
    'note_read',
    {
      title: '读取笔记',
      description: `根据笔记 ID 读取笔记的完整内容。返回笔记的标题、类型、内容、标签、文件夹等详细信息。`,
      inputSchema: {
        noteId: z.string().min(1).describe('笔记 ID'),
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
        const result = await apiRequest('GET', `/notes/${params.noteId}`);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `读取笔记失败: ${result.error?.message || '笔记不存在或无权访问'}` }],
          };
        }

        const note = result.data;
        const output = {
          id: note.id,
          title: note.title,
          type: note.type,
          content: note.content?.content || '',
          folderId: note.folderId,
          folderName: note.folder?.name || null,
          tags: (note.tags || []).map((t: any) => ({ name: t.tag?.name || t.name, color: t.tag?.color || t.color })),
          isFavorite: note.isFavorite,
          viewCount: note.viewCount,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        };

        return {
          content: [{
            type: 'text' as const,
            text: `# ${output.title}\n\n` +
              `- **类型**: ${output.type}\n` +
              `- **文件夹**: ${output.folderName || '无'}\n` +
              `- **标签**: ${output.tags.map((t: any) => t.name).join(', ') || '无'}\n` +
              `- **收藏**: ${output.isFavorite ? '是' : '否'}\n` +
              `- **更新时间**: ${output.updatedAt}\n\n` +
              `---\n\n${output.content}`,
          }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `读取笔记失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 更新笔记
  // ============================
  server.registerTool(
    'note_update',
    {
      title: '更新笔记',
      description: `更新指定笔记的标题、内容、类型、标签或文件夹。所有字段都是可选的，只会更新提供的字段。`,
      inputSchema: {
        noteId: z.string().min(1).describe('要更新的笔记 ID'),
        title: z.string().min(1).max(200).optional().describe('新标题'),
        content: z.string().optional().describe('新内容'),
        noteType: NoteTypeEnum.optional().describe('新笔记类型'),
        folderId: z.string().nullable().optional().describe('新文件夹 ID，传 null 移出文件夹'),
        tags: z.array(z.string()).optional().describe('新标签列表，将替换现有标签'),
        isFavorite: z.boolean().optional().describe('是否收藏'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const body: Record<string, any> = {};
        if (params.title !== undefined) body.title = params.title;
        if (params.content !== undefined) body.content = params.content;
        if (params.noteType !== undefined) body.noteType = params.noteType;
        if (params.folderId !== undefined) body.folderId = params.folderId;
        if (params.isFavorite !== undefined) body.isFavorite = params.isFavorite;
        if (params.tags !== undefined) {
          body.tags = params.tags.map(name => ({ name }));
        }

        const result = await apiRequest('PUT', `/notes/${params.noteId}`, body);

        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `更新笔记失败: ${result.error?.message || '笔记不存在或无权修改'}` }],
          };
        }

        const note = result.data;
        const updatedFields = Object.keys(params).filter(k => k !== 'noteId');

        return {
          content: [{
            type: 'text' as const,
            text: `✅ 笔记更新成功\n\n` +
              `- **ID**: ${note.id}\n` +
              `- **标题**: ${note.title}\n` +
              `- **更新字段**: ${updatedFields.join(', ')}\n` +
              `- **更新时间**: ${note.updatedAt}`,
          }],
          structuredContent: { id: note.id, title: note.title, type: note.type, updatedAt: note.updatedAt, updatedFields },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `更新笔记失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 删除笔记
  // ============================
  server.registerTool(
    'note_delete',
    {
      title: '删除笔记',
      description: '将笔记移入回收站（软删除）。已在回收站中的笔记再次删除将永久删除。',
      inputSchema: {
        noteId: z.string().min(1).describe('要删除的笔记 ID'),
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
        const result = await apiRequest('DELETE', `/notes/${params.noteId}`);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `删除笔记失败: ${result.error?.message || '笔记不存在或无权删除'}` }],
          };
        }
        const isPermanent = result.data?.permanent;
        return {
          content: [{
            type: 'text' as const,
            text: isPermanent ? `✅ 笔记已永久删除` : `✅ 笔记已移入回收站`,
          }],
          structuredContent: { id: params.noteId, action: isPermanent ? 'permanent_delete' : 'soft_delete' },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `删除笔记失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 恢复笔记
  // ============================
  server.registerTool(
    'note_restore',
    {
      title: '恢复笔记',
      description: '从回收站恢复已删除的笔记。',
      inputSchema: {
        noteId: z.string().min(1).describe('要恢复的笔记 ID'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', `/notes/${params.noteId}/restore`);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `恢复失败: ${result.error?.message || '笔记不存在于回收站中'}` }],
          };
        }
        return {
          content: [{ type: 'text' as const, text: `✅ 笔记已恢复` }],
          structuredContent: { id: params.noteId, action: 'restored' },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `恢复失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  // ============================
  // 切换收藏
  // ============================
  server.registerTool(
    'note_toggle_favorite',
    {
      title: '切换笔记收藏状态',
      description: '切换指定笔记的收藏/取消收藏状态。',
      inputSchema: {
        noteId: z.string().min(1).describe('笔记 ID'),
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
        const result = await apiRequest('POST', `/notes/${params.noteId}/favorite`);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `操作失败: ${result.error?.message || '笔记不存在'}` }],
          };
        }
        const isFav = result.data?.isFavorite;
        return {
          content: [{ type: 'text' as const, text: isFav ? `⭐ 笔记已收藏` : `已取消收藏` }],
          structuredContent: { id: params.noteId, isFavorite: isFav },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `操作失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
