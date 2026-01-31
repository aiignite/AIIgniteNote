import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { chatService } from '../services/chat.service';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  roomId?: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin.split(',').map(o => o.trim()).concat(['http://localhost:3200']),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const onlineUsers = new Map<string, { userId: string, name: string, socketId: string }>();

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join_chat', (data: { userId: string, name: string }) => {
      onlineUsers.set(socket.id, { ...data, socketId: socket.id });
      logger.info(`User ${data.name} (${data.userId}) joined chat`);
      
      // Broadcast updated online users list
      const users = Array.from(onlineUsers.values());
      const uniqueUsers = Array.from(new Map(users.map(u => [u.userId, u])).values());
      io.emit('online_users', uniqueUsers);
    });

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', async (message: ChatMessage) => {
      logger.debug('Message received:', message);
      
      if (message.roomId) {
        try {
          // Prefer explicit type, fallback to parsing content
          let messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' = 'TEXT';
          if (message.type) {
            messageType = message.type;
          } else if (message.content.includes('📎 [文件]')) {
            messageType = 'FILE';
          } else if (message.content.includes('📸 [截图]')) {
            messageType = 'IMAGE';
          }

          const savedMessage = await chatService.saveMessage(
            message.roomId,
            message.senderId,
            message.content,
            messageType as any,
            {
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              fileSize: message.fileSize,
              mimeType: message.mimeType
            }
          );
          
          const messageToEmit = {
            ...message,
            id: savedMessage.id,
            timestamp: savedMessage.createdAt.toISOString(),
            sender: savedMessage.sender,
            type: savedMessage.type,
            fileUrl: savedMessage.fileUrl,
            fileName: savedMessage.fileName,
            fileSize: savedMessage.fileSize,
            mimeType: savedMessage.mimeType
          };

          // Broadcast to room
          io.to(message.roomId).emit('receive_message', messageToEmit);
          
          // Also emit a typing_stop event to clear any typing indicators
          io.to(message.roomId).emit('typing_stop', { userId: message.senderId });
        } catch (error) {
          logger.error('Error saving message:', error);
          // Fallback to simpler emit if save fails
          io.to(message.roomId).emit('receive_message', message);
        }
      } else {
        io.emit('receive_message', message);
      }
    });

    // Handle typing indicators
    socket.on('user_typing', (data: { roomId: string, userId: string, name: string }) => {
      io.to(data.roomId).emit('user_typing', { userId: data.userId, name: data.name });
    });

    socket.on('user_stop_typing', (data: { roomId: string, userId: string }) => {
      io.to(data.roomId).emit('user_stop_typing', { userId: data.userId });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      onlineUsers.delete(socket.id);
      
      // Broadcast updated online users list
      const users = Array.from(onlineUsers.values());
      const uniqueUsers = Array.from(new Map(users.map(u => [u.userId, u])).values());
      io.emit('online_users', uniqueUsers);
    });
  });

  return io;
};
