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
          const savedMessage = await chatService.saveMessage(message.roomId, message.senderId, message.content);
          
          const messageToEmit = {
            ...message,
            id: savedMessage.id,
            timestamp: savedMessage.createdAt.toISOString(),
            sender: savedMessage.sender
          };

          io.to(message.roomId).emit('receive_message', messageToEmit);
        } catch (error) {
          logger.error('Error saving message:', error);
          // Fallback to simpler emit if save fails, or handle error
          io.to(message.roomId).emit('receive_message', message);
        }
      } else {
        io.emit('receive_message', message);
      }
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
