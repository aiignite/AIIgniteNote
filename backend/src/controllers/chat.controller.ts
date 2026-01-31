import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { success, error } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, '/app/uploads/chat');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export class ChatController {
  listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      const users = await chatService.listUsers();
      success(res, users);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to fetch users', 500);
    }
  };
  getMyRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }
      const rooms = await chatService.getUserRooms(userId);
      success(res, rooms);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to fetch rooms', 500);
    }
  };

  getRoomMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const roomId = getParam(req.params.roomId);
      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }
      const parsedLimit = req.query.limit ? Number(req.query.limit) : undefined;
      const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
      const since = typeof req.query.since === 'string' ? new Date(req.query.since) : undefined;

      const messages = query
        ? await chatService.searchMessages(roomId as string, query, limit, cursor)
        : await chatService.getMessages(roomId as string, limit, cursor, since && !isNaN(since.getTime()) ? since : undefined);
      success(res, messages);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to fetch messages', 500);
    }
  };

  startDirectChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const targetUserId = req.body.userId;
      
      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }
      if (!targetUserId) {
        error(res, 'VALIDATION_ERROR', 'Target user ID is required', 400);
        return;
      }

      const room = await chatService.getOrCreateDirectRoom(userId, targetUserId);
      success(res, room);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to start chat', 500);
    }
  };

  createGroupChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const { name, memberIds } = req.body as { name?: string; memberIds?: string[] };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        error(res, 'VALIDATION_ERROR', 'memberIds is required', 400);
        return;
      }

      const room = await chatService.createGroupRoom(userId, name || '群组聊天', memberIds);
      success(res, room);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to create group chat', 500);
    }
  };

  updateGroupName = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const { name } = req.body as { name?: string };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      if (!name || !name.trim()) {
        error(res, 'VALIDATION_ERROR', 'name is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }
      if (me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can update group name', 403);
        return;
      }
      const updated = await chatService.updateGroupName(roomId, name.trim());
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to update group name', 500);
    }
  };

  addGroupMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const { memberIds } = req.body as { memberIds?: string[] };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        error(res, 'VALIDATION_ERROR', 'memberIds is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }
      if (me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can add members', 403);
        return;
      }
      const updated = await chatService.addMembers(roomId, memberIds);
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to add group members', 500);
    }
  };

  removeGroupMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const memberId = getParam(req.params.memberId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId || !memberId) {
        error(res, 'VALIDATION_ERROR', 'roomId and memberId are required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }
      if (me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can remove members', 403);
        return;
      }

      const updated = await chatService.removeMember(roomId, memberId);
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to remove group member', 500);
    }
  };

  updateMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const memberId = getParam(req.params.memberId);
      const { role } = req.body as { role?: 'ADMIN' | 'MEMBER' };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId || !memberId) {
        error(res, 'VALIDATION_ERROR', 'roomId and memberId are required', 400);
        return;
      }

      if (role !== 'ADMIN' && role !== 'MEMBER') {
        error(res, 'VALIDATION_ERROR', 'Invalid role', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }
      if (me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can change roles', 403);
        return;
      }

      const updated = await chatService.updateMemberRole(roomId, memberId, role);
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to update member role', 500);
    }
  };

  leaveRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }

      const adminCount = room.members.filter(m => m.role === 'ADMIN').length;
      if (me.role === 'ADMIN' && adminCount <= 1 && room.members.length > 1) {
        error(res, 'FORBIDDEN', 'Please transfer admin role before leaving', 403);
        return;
      }

      if (room.members.length === 1) {
        await chatService.deleteRoom(roomId);
        success(res, { roomId, deleted: true });
        return;
      }

      const updated = await chatService.removeMember(roomId, userId);
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to leave room', 500);
    }
  };

  deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const messageId = getParam(req.params.messageId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!messageId) {
        error(res, 'VALIDATION_ERROR', 'messageId is required', 400);
        return;
      }

      const message = await chatService.getMessageById(messageId);
      if (!message) {
        error(res, 'NOT_FOUND', 'Message not found', 404);
        return;
      }

      if (message.senderId !== userId) {
        if (message.chatRoom.type === 'GROUP') {
          const room = await chatService.getRoom(message.chatRoomId);
          const me = room?.members.find(m => m.userId === userId);
          if (!me || me.role !== 'ADMIN') {
            error(res, 'FORBIDDEN', 'Only sender or admin can delete message', 403);
            return;
          }
        } else {
          error(res, 'FORBIDDEN', 'Only sender can delete message', 403);
          return;
        }
      }

      await chatService.deleteMessage(messageId);
      success(res, { messageId });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to delete message', 500);
    }
  };

  updateMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const messageId = getParam(req.params.messageId);
      const { content } = req.body as { content?: string };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!messageId) {
        error(res, 'VALIDATION_ERROR', 'messageId is required', 400);
        return;
      }

      if (!content || !content.trim()) {
        error(res, 'VALIDATION_ERROR', 'content is required', 400);
        return;
      }

      const message = await chatService.getMessageById(messageId);
      if (!message) {
        error(res, 'NOT_FOUND', 'Message not found', 404);
        return;
      }

      if (message.senderId !== userId) {
        error(res, 'FORBIDDEN', 'Only sender can edit message', 403);
        return;
      }

      const updated = await chatService.updateMessage(messageId, content.trim());
      success(res, updated);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to update message', 500);
    }
  };

  postAnnouncement = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const { content } = req.body as { content?: string };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      if (!content || !content.trim()) {
        error(res, 'VALIDATION_ERROR', 'content is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room || room.type !== 'GROUP') {
        error(res, 'NOT_FOUND', 'Group room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me || me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can post announcements', 403);
        return;
      }

      const message = await chatService.createSystemMessage(roomId, userId, `公告：${content.trim()}`);
      success(res, message);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to post announcement', 500);
    }
  };

  getPinnedMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const pinned = await chatService.getPinnedMessage(roomId);
      success(res, pinned);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to fetch pinned message', 500);
    }
  };

  pinMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const messageId = getParam(req.params.messageId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId || !messageId) {
        error(res, 'VALIDATION_ERROR', 'roomId and messageId are required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      const me = room?.members.find(m => m.userId === userId);
      if (!room || room.type !== 'GROUP' || !me || me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can pin messages', 403);
        return;
      }

      const pinned = await chatService.pinMessage(roomId, messageId);
      success(res, pinned);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to pin message', 500);
    }
  };

  unpinMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      const me = room?.members.find(m => m.userId === userId);
      if (!room || room.type !== 'GROUP' || !me || me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can unpin messages', 403);
        return;
      }

      await chatService.unpinMessage(roomId);
      success(res, { roomId });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to unpin message', 500);
    }
  };

  markRoomRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      await chatService.markAsRead(roomId, userId);
      success(res, { roomId, readAt: new Date().toISOString() });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to mark as read', 500);
    }
  };

  getRoomFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const parsedLimit = req.query.limit ? Number(req.query.limit) : undefined;
      const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

      const files = await chatService.getRoomFiles(roomId, limit, cursor);
      success(res, files);
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to fetch room files', 500);
    }
  };

  purgeRoomFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const { days } = req.body as { days?: number };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room) {
        error(res, 'NOT_FOUND', 'Room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }

      if (room.type === 'GROUP' && me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can purge files', 403);
        return;
      }

      const daysValue = Number.isFinite(days) ? Number(days) : 30;
      const cutoff = new Date(Date.now() - daysValue * 24 * 60 * 60 * 1000);
      const files = await chatService.purgeRoomFiles(roomId, cutoff);

      await Promise.all(
        files
          .filter(f => !!f.fileUrl)
          .map(async f => {
            const fileUrl = f.fileUrl as string;
            if (!fileUrl.startsWith('/uploads/')) return;
            const filePath = path.join('/app', fileUrl);
            try {
              await fs.unlink(filePath);
            } catch {
              // ignore missing files
            }
          })
      );

      success(res, { removed: files.length });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to purge files', 500);
    }
  };

  purgeSystemMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      const roomId = getParam(req.params.roomId);
      const { days } = req.body as { days?: number };

      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      if (!roomId) {
        error(res, 'VALIDATION_ERROR', 'roomId is required', 400);
        return;
      }

      const room = await chatService.getRoom(roomId);
      if (!room) {
        error(res, 'NOT_FOUND', 'Room not found', 404);
        return;
      }

      const me = room.members.find(m => m.userId === userId);
      if (!me) {
        error(res, 'FORBIDDEN', 'Not a member of this room', 403);
        return;
      }

      if (room.type === 'GROUP' && me.role !== 'ADMIN') {
        error(res, 'FORBIDDEN', 'Only admins can purge system messages', 403);
        return;
      }

      const daysValue = Number.isFinite(days) ? Number(days) : 30;
      const cutoff = new Date(Date.now() - daysValue * 24 * 60 * 60 * 1000);
      const result = await chatService.purgeSystemMessages(roomId, cutoff);
      success(res, { removed: result.count });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to purge system messages', 500);
    }
  };

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        error(res, 'UNAUTHORIZED', 'Unauthorized', 401);
        return;
      }

      upload.single('file')(req, res, (err) => {
        if (err) {
          error(res, 'UPLOAD_ERROR', 'File upload failed', 400);
          return;
        }

        const file = (req as any).file;
        if (!file) {
          error(res, 'NO_FILE', 'No file uploaded', 400);
          return;
        }

        const fileUrl = `/uploads/chat/${file.filename}`;
        success(res, { fileUrl, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype });
      });
    } catch (err) {
      error(res, 'INTERNAL_ERROR', 'Failed to upload file', 500);
    }
  };
}

export const chatController = new ChatController();
