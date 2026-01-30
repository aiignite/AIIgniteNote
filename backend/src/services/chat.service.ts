import { prisma } from '../config/database';
import { MessageType } from '@prisma/client';

export class ChatService {
  /**
   * Create or get a direct chat room between two users
   */
  async getOrCreateDirectRoom(userId1: string, userId2: string) {
    // Check if a direct room already exists
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true }
            }
          }
        }
      }
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Create new room
    return await prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId: userId1, role: 'MEMBER' },
            { userId: userId2, role: 'MEMBER' }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true }
            }
          }
        }
      }
    });
  }

  /**
   * Create a group chat room
   */
  async createGroupRoom(creatorId: string, name: string, memberIds: string[]) {
    // Ensure creator is in memberIds
    const allMembers = Array.from(new Set([...memberIds, creatorId]));

    return await prisma.chatRoom.create({
      data: {
        type: 'GROUP',
        name,
        members: {
          create: allMembers.map(id => ({
            userId: id,
            role: id === creatorId ? 'ADMIN' : 'MEMBER'
          }))
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true }
            }
          }
        }
      }
    });
  }

  /**
   * Get user's chat rooms
   */
  async getUserRooms(userId: string) {
    return await prisma.chatRoom.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Save a message to database
   */
  async saveMessage(roomId: string, senderId: string, content: string, type: MessageType = 'TEXT') {
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
        type
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    // Update room's updatedAt
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  /**
   * Get messages for a room
   */
  async getMessages(roomId: string, limit = 50, cursor?: string) {
    return await prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId: string, userId: string) {
    return await prisma.chatMember.update({
      where: {
        chatRoomId_userId: {
          chatRoomId: roomId,
          userId
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });
  }
}

export const chatService = new ChatService();
