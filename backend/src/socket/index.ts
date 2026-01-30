import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';

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

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', (message: ChatMessage) => {
      logger.debug('Message received:', message);
      
      if (message.roomId) {
        io.to(message.roomId).emit('receive_message', message);
      } else {
        io.emit('receive_message', message);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
