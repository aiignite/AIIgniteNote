import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';
import { config } from '../config';
import { attachmentsService } from './attachments.service';
import { attachmentService } from './attachment.service';

export type FileSource = 'note' | 'ai' | 'chat';

export interface FileListItem {
  id: string;
  source: FileSource;
  fileName: string;
  storedName?: string;
  fileSize?: number | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  createdAt: Date;
  noteId?: string | null;
  noteTitle?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  senderId?: string | null;
  senderName?: string | null;
}

interface ListOptions {
  source?: FileSource | 'all';
  limit?: number;
  cursor?: string;
  query?: string;
}

interface ListResult {
  items: FileListItem[];
  hasMore: boolean;
  nextCursor?: string;
}

const clampLimit = (value?: number) => {
  const defaultLimit = 50;
  const maxLimit = 200;
  if (!value || !Number.isFinite(value)) return defaultLimit;
  return Math.min(Math.max(Math.floor(value), 1), maxLimit);
};

const parseCursor = (cursor?: string): Date | undefined => {
  if (!cursor) return undefined;
  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export class FilesService {
  async listFiles(userId: string, options: ListOptions = {}): Promise<ListResult> {
    const source = options.source || 'all';
    const limit = clampLimit(options.limit);
    const cursorDate = parseCursor(options.cursor);
    const query = options.query?.trim();
    const take = limit + 1;

    const workspaceIds = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIdList = workspaceIds.map(item => item.workspaceId);

    const noteWhere: any = {
      note: {
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspaceId: { in: workspaceIdList } },
        ],
      },
    };
    if (query) {
      noteWhere.fileName = { contains: query, mode: 'insensitive' };
    }
    if (cursorDate) {
      noteWhere.createdAt = { lt: cursorDate };
    }

    const aiWhere: any = { userId };
    if (query) {
      aiWhere.originalName = { contains: query, mode: 'insensitive' };
    }
    if (cursorDate) {
      aiWhere.createdAt = { lt: cursorDate };
    }

    const chatWhere: any = {
      fileUrl: { not: null },
      chatRoom: { members: { some: { userId } } },
    };
    if (query) {
      chatWhere.OR = [
        { fileName: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (cursorDate) {
      chatWhere.createdAt = { lt: cursorDate };
    }

    const shouldInclude = {
      note: source === 'all' || source === 'note',
      ai: source === 'all' || source === 'ai',
      chat: source === 'all' || source === 'chat',
    };

    const [noteAttachments, aiAttachments, chatMessages] = await Promise.all([
      shouldInclude.note
        ? prisma.attachment.findMany({
            where: noteWhere,
            include: { note: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
      shouldInclude.ai
        ? prisma.aIAttachment.findMany({
            where: aiWhere,
            orderBy: { createdAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
      shouldInclude.chat
        ? prisma.chatMessage.findMany({
            where: chatWhere,
            include: {
              chatRoom: { select: { id: true, name: true } },
              sender: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
    ]);

    const noteHasMore = noteAttachments.length > limit;
    const aiHasMore = aiAttachments.length > limit;
    const chatHasMore = chatMessages.length > limit;

    const noteItems = noteAttachments.slice(0, limit).map(att => ({
      id: att.id,
      source: 'note' as const,
      fileName: att.fileName,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      fileUrl: att.fileUrl,
      createdAt: att.createdAt,
      noteId: att.noteId,
      noteTitle: att.note?.title || null,
    }));

    const aiItems = aiAttachments.slice(0, limit).map(att => ({
      id: att.id,
      source: 'ai' as const,
      fileName: att.originalName,
      storedName: att.fileName,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      fileUrl: att.filePath,
      createdAt: att.createdAt,
    }));

    const chatItems = chatMessages.slice(0, limit).map(msg => ({
      id: msg.id,
      source: 'chat' as const,
      fileName: msg.fileName || msg.content,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      fileUrl: msg.fileUrl,
      createdAt: msg.createdAt,
      roomId: msg.chatRoomId,
      roomName: msg.chatRoom?.name || null,
      senderId: msg.senderId,
      senderName: msg.sender?.name || msg.sender?.email || null,
    }));

    let items: FileListItem[] = [];
    if (source === 'note') items = noteItems;
    if (source === 'ai') items = aiItems;
    if (source === 'chat') items = chatItems;
    if (source === 'all') {
      items = [...noteItems, ...aiItems, ...chatItems].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    const sliced = items.slice(0, limit);
    const hasMore = source === 'all'
      ? noteHasMore || aiHasMore || chatHasMore || items.length > limit
      : (source === 'note' ? noteHasMore : source === 'ai' ? aiHasMore : chatHasMore);

    const nextCursor = sliced.length > 0
      ? sliced[sliced.length - 1].createdAt.toISOString()
      : undefined;

    return {
      items: sliced,
      hasMore,
      nextCursor,
    };
  }

  async deleteFile(userId: string, source: FileSource, id: string): Promise<void> {
    if (source === 'note') {
      await attachmentsService.delete(userId, id);
      return;
    }

    if (source === 'ai') {
      await attachmentService.deleteAttachment(id, userId);
      return;
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        chatRoom: { include: { members: true } },
      },
    });

    if (!message || !message.fileUrl) {
      throw new ApiErrorClass('FILE_NOT_FOUND', 'File not found', 404);
    }

    const member = message.chatRoom.members.find(m => m.userId === userId);
    if (!member) {
      throw new ApiErrorClass('FORBIDDEN', 'Not a member of this room', 403);
    }

    const isAdmin = message.chatRoom.type === 'GROUP' && member.role === 'ADMIN';
    const canDelete = message.senderId === userId || isAdmin;
    if (!canDelete) {
      throw new ApiErrorClass('FORBIDDEN', 'No permission to delete this file', 403);
    }

    await prisma.chatMessage.delete({ where: { id } });

    if (message.fileUrl.startsWith('/uploads/')) {
      const relativePath = message.fileUrl.replace(/^\/uploads\//, '');
      const filePath = path.resolve(process.cwd(), config.uploadDir, relativePath);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore missing files
      }
    }
  }
}

export const filesService = new FilesService();
