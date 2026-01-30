import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { success, error } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export class ChatController {
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
      const { roomId } = req.params;
      const messages = await chatService.getMessages(roomId as string);
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
}

export const chatController = new ChatController();
