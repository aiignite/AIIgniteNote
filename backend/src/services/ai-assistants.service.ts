import { prisma } from '../config/database';
import { createError } from '../utils/response';

export interface CreateAssistantInput {
  name: string;
  description?: string;
  avatar?: string;
  role?: string;
  category?: string;
  systemPrompt?: string;
  isSystem?: boolean;
  workspaceId?: string;
}

export interface UpdateAssistantInput {
  name?: string;
  description?: string;
  avatar?: string;
  role?: string;
  category?: string;
  systemPrompt?: string;
}

export const assistantsService = {
  async getAssistants(userId: string, workspaceId?: string) {
    const [systemAssistants, customAssistants] = await Promise.all([
      prisma.aIAssistant.findMany({
        where: { isSystem: true },
      }),
      prisma.aIAssistant.findMany({
        where: {
          userId,
          workspaceId: workspaceId || undefined,
          isSystem: false,
        },
      }),
    ]);

    return { system: systemAssistants, custom: customAssistants };
  },

  async getAssistant(userId: string, assistantId: string) {
    const assistant = await prisma.aIAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      throw createError.notFound('Assistant not found');
    }

    if (!assistant.isSystem && assistant.userId !== userId) {
      throw createError.forbidden('You do not have permission to access this assistant');
    }

    return assistant;
  },

  async createAssistant(userId: string, input: CreateAssistantInput) {
    return prisma.aIAssistant.create({
      data: {
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        role: input.role,
        category: input.category,
        systemPrompt: input.systemPrompt || '',
        isSystem: input.isSystem || false,
        userId,
        workspaceId: input.workspaceId,
      },
    });
  },

  async updateAssistant(userId: string, assistantId: string, input: UpdateAssistantInput) {
    const assistant = await prisma.aIAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      throw createError.notFound('Assistant not found');
    }

    if (assistant.isSystem) {
      throw createError.badRequest('Cannot update system assistants');
    }

    if (assistant.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this assistant');
    }

    return prisma.aIAssistant.update({
      where: { id: assistantId },
      data: input,
    });
  },

  async deleteAssistant(userId: string, assistantId: string) {
    const assistant = await prisma.aIAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      throw createError.notFound('Assistant not found');
    }

    if (assistant.isSystem) {
      throw createError.badRequest('Cannot delete system assistants');
    }

    if (assistant.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this assistant');
    }

    await prisma.aIAssistant.delete({
      where: { id: assistantId },
    });
  },
};

export interface CreateConversationTagInput {
  conversationId: string;
  tag: string;
}

export const conversationTagsService = {
  async getConversationTags(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw createError.notFound('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw createError.forbidden('You do not have permission to access this conversation');
    }

    return prisma.aIConversationTag.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async addTagToConversation(userId: string, input: CreateConversationTagInput) {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation) {
      throw createError.notFound('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this conversation');
    }

    return prisma.aIConversationTag.create({
      data: {
        conversationId: input.conversationId,
        tag: input.tag,
      },
    });
  },

  async removeTagFromConversation(userId: string, tagId: string) {
    const tag = await prisma.aIConversationTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw createError.notFound('Tag not found');
    }

    const conversation = await prisma.aIConversation.findUnique({
      where: { id: tag.conversationId },
    });

    if (conversation?.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this conversation');
    }

    await prisma.aIConversationTag.delete({
      where: { id: tagId },
    });
  },
};

export interface CreateFavoriteMessageInput {
  messageId: string;
  conversationId: string;
}

export const favoriteMessagesService = {
  async getFavoriteMessages(userId: string) {
    return prisma.aIFavoriteMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  },

  async isMessageFavorited(userId: string, messageId: string) {
    const favorite = await prisma.aIFavoriteMessage.findUnique({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    return !!favorite;
  },

  async addToFavorites(userId: string, input: CreateFavoriteMessageInput) {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation) {
      throw createError.notFound('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw createError.forbidden('You do not have permission to modify this conversation');
    }

    return prisma.aIFavoriteMessage.create({
      data: {
        userId,
        messageId: input.messageId,
        conversationId: input.conversationId,
      },
    });
  },

  async removeFromFavorites(userId: string, messageId: string) {
    const favorite = await prisma.aIFavoriteMessage.findUnique({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (!favorite) {
      throw createError.notFound('Favorite not found');
    }

    await prisma.aIFavoriteMessage.delete({
      where: { id: favorite.id },
    });
  },
};

export interface CreateCustomPromptInput {
  name: string;
  prompt: string;
  category?: string;
}

export interface UpdateCustomPromptInput {
  name?: string;
  prompt?: string;
  category?: string;
}

export const customPromptsService = {
  async getCustomPrompts(userId: string) {
    return prisma.aICustomPrompt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getCustomPrompt(userId: string, promptId: string) {
    const prompt = await prisma.aICustomPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw createError.notFound('Prompt not found');
    }

    if (prompt.userId !== userId) {
      throw createError.forbidden('You do not have permission to access this prompt');
    }

    return prompt;
  },

  async createCustomPrompt(userId: string, input: CreateCustomPromptInput) {
    return prisma.aICustomPrompt.create({
      data: {
        name: input.name,
        prompt: input.prompt,
        category: input.category,
        userId,
      },
    });
  },

  async updateCustomPrompt(userId: string, promptId: string, input: UpdateCustomPromptInput) {
    const prompt = await prisma.aICustomPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw createError.notFound('Prompt not found');
    }

    if (prompt.userId !== userId) {
      throw createError.forbidden('You do not have permission to update this prompt');
    }

    return prisma.aICustomPrompt.update({
      where: { id: promptId },
      data: input,
    });
  },

  async deleteCustomPrompt(userId: string, promptId: string) {
    const prompt = await prisma.aICustomPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      throw createError.notFound('Prompt not found');
    }

    if (prompt.userId !== userId) {
      throw createError.forbidden('You do not have permission to delete this prompt');
    }

    await prisma.aICustomPrompt.delete({
      where: { id: promptId },
    });
  },
};
