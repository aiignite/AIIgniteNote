import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  roomId?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];

  connect() {
    if (this.socket) return;
    
    const token = api.getToken();
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3215';
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('receive_message', (message: ChatMessage) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('online_users', (users: any[]) => {
      this.onlineUsersHandlers.forEach(handler => handler(users));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }

  private onlineUsersHandlers: ((users: any[]) => void)[] = [];

  onOnlineUsers(handler: (users: any[]) => void) {
    this.onlineUsersHandlers.push(handler);
    return () => {
      this.onlineUsersHandlers = this.onlineUsersHandlers.filter(h => h !== handler);
    };
  }

  joinChat(userId: string, name: string) {
    if (this.socket) {
      this.socket.emit('join_chat', { userId, name });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join_room', roomId);
    }
  }

  sendMessage(message: Omit<ChatMessage, 'timestamp'>) {
    if (this.socket) {
      const payload: ChatMessage = {
        ...message,
        timestamp: new Date().toISOString()
      };
      this.socket.emit('send_message', payload);
    }
  }

  onMessage(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

export const socketService = new SocketService();
