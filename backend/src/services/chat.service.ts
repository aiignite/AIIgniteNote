import { prisma } from '../config/database';
import { MessageType } from '@prisma/client';

export class ChatService {
  /**
   * List users for chat
   */
  async listUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
  }
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
    const rooms = await prisma.chatRoom.findMany({
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

    const enriched = await Promise.all(
      rooms.map(async (room) => {
        const member = room.members.find(m => m.userId === userId);
        const lastReadAt = member?.lastReadAt || new Date(0);
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatRoomId: room.id,
            createdAt: { gt: lastReadAt }
          }
        });
        return { ...room, unreadCount } as any;
      })
    );

    return enriched;
  }

  /**
   * Update group room name
   */
  async updateGroupName(roomId: string, name: string) {
    return await prisma.chatRoom.update({
      where: { id: roomId },
      data: { name },
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
   * Add members to a group room
   */
  async addMembers(roomId: string, memberIds: string[]) {
    if (memberIds.length === 0) return this.getRoom(roomId);

    await prisma.chatMember.createMany({
      data: memberIds.map(userId => ({
        chatRoomId: roomId,
        userId,
        role: 'MEMBER'
      })),
      skipDuplicates: true
    });

    return this.getRoom(roomId);
  }

  /**
   * Remove a member from room
   */
  async removeMember(roomId: string, memberId: string) {
    await prisma.chatMember.delete({
      where: {
        chatRoomId_userId: {
          chatRoomId: roomId,
          userId: memberId
        }
      }
    });

    return this.getRoom(roomId);
  }

  /**
   * Update member role
   */
  async updateMemberRole(roomId: string, memberId: string, role: 'ADMIN' | 'MEMBER') {
    await prisma.chatMember.update({
      where: {
        chatRoomId_userId: {
          chatRoomId: roomId,
          userId: memberId
        }
      },
      data: { role }
    });

    return this.getRoom(roomId);
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string) {
    return await prisma.chatRoom.delete({
      where: { id: roomId }
    });
  }

  /**
   * Get message by id
   */
  async getMessageById(messageId: string) {
    return await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        chatRoom: true
      }
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string) {
    return await prisma.chatMessage.delete({
      where: { id: messageId }
    });
  }

  /**
   * Update message content
   */
  async updateMessage(messageId: string, content: string) {
    return await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content }
    });
  }

  /**
   * Create system message (announcement)
   */
  async createSystemMessage(roomId: string, senderId: string, content: string) {
    return await this.saveMessage(roomId, senderId, content, 'SYSTEM');
  }

  /**
   * Pin a message (only one pinned per room)
   */
  async pinMessage(roomId: string, messageId: string) {
    await prisma.$transaction([
      prisma.chatMessage.updateMany({
        where: { chatRoomId: roomId, isPinned: true },
        data: { isPinned: false }
      }),
      prisma.chatMessage.update({
        where: { id: messageId },
        data: { isPinned: true }
      })
    ]);

    return await this.getPinnedMessage(roomId);
  }

  async unpinMessage(roomId: string) {
    await prisma.chatMessage.updateMany({
      where: { chatRoomId: roomId, isPinned: true },
      data: { isPinned: false }
    });
  }

  async getPinnedMessage(roomId: string) {
    return await prisma.chatMessage.findFirst({
      where: { chatRoomId: roomId, isPinned: true },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, image: true } }
      }
    });
  }

  /**
   * Get room with members
   */
  async getRoom(roomId: string) {
    return await prisma.chatRoom.findUnique({
      where: { id: roomId },
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
   * Save a message to database
   */
  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: MessageType = 'TEXT',
    file?: {
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }
  ) {
    const message = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
        type,
        fileUrl: file?.fileUrl,
        fileName: file?.fileName,
        fileSize: file?.fileSize,
        mimeType: file?.mimeType
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
  async getMessages(roomId: string, limit = 50, cursor?: string, since?: Date) {
    return await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        ...(since ? { createdAt: { gt: since } } : {})
      },
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
   * Search messages in a room by keyword
   */
  async searchMessages(roomId: string, query: string, limit = 50, cursor?: string) {
    return await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
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

  /**
   * List files in a room
   */
  async getRoomFiles(roomId: string, limit = 50, cursor?: string) {
    return await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        type: 'FILE',
        fileUrl: { not: null }
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    });
  }

  /**
   * Purge files before a date
   */
  async purgeRoomFiles(roomId: string, beforeDate: Date) {
    const files = await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        type: 'FILE',
        createdAt: { lt: beforeDate },
        fileUrl: { not: null }
      },
      select: { id: true, fileUrl: true }
    });

    if (files.length === 0) return files;

    await prisma.chatMessage.deleteMany({
      where: { id: { in: files.map(f => f.id) } }
    });

    return files;
  }

  /**
   * Purge system messages before a date
   */
  async purgeSystemMessages(roomId: string, beforeDate: Date) {
    return await prisma.chatMessage.deleteMany({
      where: {
        chatRoomId: roomId,
        type: 'SYSTEM',
        createdAt: { lt: beforeDate }
      }
    });
  }
}

export const chatService = new ChatService();
