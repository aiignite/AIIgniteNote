import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface ChatMessage {
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
  sender?: {
    id: string;
    name: string;
    image?: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private typingHandlers: ((data: { userId: string; name: string }) => void)[] = [];
  private stopTypingHandlers: ((data: { userId: string }) => void)[] = [];
  private connectHandlers: (() => void)[] = [];
  private disconnectHandlers: (() => void)[] = [];

  connect() {
    if (this.socket) return;
    
    const token = api.getToken();
    const SOCKET_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3215`;
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.connectHandlers.forEach(handler => handler());
    });

    this.socket.on('receive_message', (message: ChatMessage) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('online_users', (users: any[]) => {
      this.onlineUsersHandlers.forEach(handler => handler(users));
    });

    this.socket.on('user_typing', (data: { userId: string; name: string }) => {
      this.typingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_stop_typing', (data: { userId: string }) => {
      this.stopTypingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      this.disconnectHandlers.forEach(handler => handler());
    });
  }

  private onlineUsersHandlers: ((users: any[]) => void)[] = [];

  onOnlineUsers(handler: (users: any[]) => void) {
    this.onlineUsersHandlers.push(handler);
    return () => {
      this.onlineUsersHandlers = this.onlineUsersHandlers.filter(h => h !== handler);
    };
  }

  onConnect(handler: () => void) {
    this.connectHandlers.push(handler);
    return () => {
      this.connectHandlers = this.connectHandlers.filter(h => h !== handler);
    };
  }

  onDisconnect(handler: () => void) {
    this.disconnectHandlers.push(handler);
    return () => {
      this.disconnectHandlers = this.disconnectHandlers.filter(h => h !== handler);
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

  onUserTyping(handler: (data: { userId: string; name: string }) => void) {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  onUserStopTyping(handler: (data: { userId: string }) => void) {
    this.stopTypingHandlers.push(handler);
    return () => {
      this.stopTypingHandlers = this.stopTypingHandlers.filter(h => h !== handler);
    };
  }

  emitUserTyping(roomId: string, userId: string, name: string) {
    if (this.socket) {
      this.socket.emit('user_typing', { roomId, userId, name });
    }
  }

  emitUserStopTyping(roomId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('user_stop_typing', { roomId, userId });
    }
  }
}

export const socketService = new SocketService();
