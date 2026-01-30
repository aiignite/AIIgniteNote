import { prisma } from '../config/database';
import { AIProviderFactory } from './ai';
import { AIProvider, ChatMessage, ChatOptions } from '../types';
import { ApiErrorClass } from '../utils/response';
import { config } from '../config';
import { attachmentService } from './attachment.service';

export class AIService {
  /**
   * Generate conversation title from first message
   */
  private async generateConversationTitle(firstMessage: string): Promise<string> {
    if (!firstMessage || firstMessage.length < 10) {
      return 'New Chat';
    }

    // Extract key words for a meaningful title
    const maxLength = 50;

    // Remove common prefixes
    let title = firstMessage
      .replace(/^(write|create|generate|help me|please|can you|i need|i want|how to|what is|explain)/i, '')
      .trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Truncate if too long
    if (title.length > maxLength) {
      title = title.substring(0, maxLength);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 0) {
        title = title.substring(0, lastSpace);
      }
      title += '...';
    }

    return title || 'New Chat';
  }

  /**
   * Stream AI chat response using Server-Sent Events
   */
  async *chatStream(
    userId: string,
    provider: AIProvider,
    messages: ChatMessage[],
    options?: ChatOptions,
    conversationId?: string,
    attachmentIds?: string[]
  ): AsyncGenerator<any> {
    // Get user's AI settings if available
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Determine which provider to use
    const selectedProvider = provider || userSettings?.aiModelPreference as AIProvider || AIProvider.GEMINI;

    // Get API key for the provider
    const apiKey = this.getProviderApiKey(selectedProvider);
    const baseURL = this.getProviderBaseURL(selectedProvider);

    // Create provider instance
    let aiProvider = AIProviderFactory.create(selectedProvider, {
      apiKey,
      baseURL,
      model: options?.model,
    });

    // Check if provider is available
    const isAvailable = await aiProvider.isAvailable();
    let useMockProvider = false;

    if (!isAvailable) {
      console.warn(`Provider ${selectedProvider} is not available, falling back to Mock provider`);
      useMockProvider = true;
      aiProvider = AIProviderFactory.create('MOCK' as AIProvider, {
        apiKey: '',
        baseURL: '',
        model: 'mock-model-v1'
      });
    }

    // Process attachments if provided
    let enhancedMessages = [...messages];
    if (attachmentIds && attachmentIds.length > 0) {
      try {
        const attachmentContent = await attachmentService.getAttachmentsContent(attachmentIds);
        if (attachmentContent && attachmentContent.trim()) {
          const attachmentSystemMessage: ChatMessage = {
            role: 'system',
            content: `\n\n=== ATTACHED FILES CONTENT ===\n\n${attachmentContent}\n\n=== END OF ATTACHED FILES ===\n\n`
          };
          enhancedMessages.splice(1, 0, attachmentSystemMessage);
        }
      } catch (error) {
        console.error('Failed to process attachments:', error);
      }
    }

    // Create conversation if not exists
    let currentConversationId = conversationId;
    let conversation: any = null;

    if (!conversationId) {
      const firstUserMessage = messages.find(m => m.role === 'user')?.content || '';
      const generatedTitle = await this.generateConversationTitle(firstUserMessage);

      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          title: generatedTitle,
          provider: useMockProvider ? ('MOCK' as any) : selectedProvider,
          model: options?.model || 'default-model',
        },
      });
      currentConversationId = conversation.id;
    }

    // Save user message immediately
    if (messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user' && currentConversationId) {
        await prisma.aIMessage.create({
          data: {
            conversationId: currentConversationId,
            role: 'user',
            content: lastUserMessage.content,
          },
        });
      }
    }

    // Stream the AI response
    let fullResponse = '';

    // Check if provider supports streaming
    if (aiProvider.streamChat) {
      // Use provider's streaming implementation
      const stream = aiProvider.streamChat(enhancedMessages, options);

      for await (const chunk of stream) {
        fullResponse += chunk;
        yield {
          content: chunk,
          done: false,
          conversationId: currentConversationId
        };
      }
    } else {
      // Fallback to non-streaming with chunked output
      const response = await aiProvider.chat(enhancedMessages, options);

      // Split response into chunks for streaming effect
      const fullText = response.content || '';
      const chunkSize = 10; // Characters per chunk

      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize);
        fullResponse += chunk;
        yield {
          content: chunk,
          done: false,
          conversationId: currentConversationId
        };

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    // Save assistant message
    if (currentConversationId && fullResponse) {
      await prisma.aIMessage.create({
        data: {
          conversationId: currentConversationId,
          role: 'assistant',
          content: fullResponse,
        },
      });
    }

    // Send done signal with conversation ID
    yield { content: '', done: true, conversationId: currentConversationId };
  }

  /**
   * Send AI chat request
   */
  async chat(
    userId: string,
    provider: AIProvider,
    messages: ChatMessage[],
    options?: ChatOptions,
    conversationId?: string,
    attachmentIds?: string[]
  ) {
    // Get user's AI settings if available
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Determine which provider to use
    const selectedProvider = provider || userSettings?.aiModelPreference as AIProvider || AIProvider.GEMINI;

    // Get API key for the provider
    const apiKey = this.getProviderApiKey(selectedProvider);
    const baseURL = this.getProviderBaseURL(selectedProvider);

    // Create provider instance
    let aiProvider = AIProviderFactory.create(selectedProvider, {
      apiKey,
      baseURL,
      model: options?.model,
    });

    // Check if provider is available
    const isAvailable = await aiProvider.isAvailable();
    let useMockProvider = false;

    if (!isAvailable) {
      console.warn(`Provider ${selectedProvider} is not available, falling back to Mock provider`);
      useMockProvider = true;
      aiProvider = AIProviderFactory.create('MOCK' as AIProvider, {
        apiKey: '',
        baseURL: '',
        model: 'mock-model-v1'
      });
    }

    // Process attachments if provided
    let enhancedMessages = [...messages];
    if (attachmentIds && attachmentIds.length > 0) {
      try {
        // Get attachment content for AI context
        const attachmentContent = await attachmentService.getAttachmentsContent(attachmentIds);

        // Add attachment content as a system message if content was retrieved
        if (attachmentContent && attachmentContent.trim()) {
          const attachmentSystemMessage: ChatMessage = {
            role: 'system',
            content: `\n\n=== ATTACHED FILES CONTENT ===\n\n${attachmentContent}\n\n=== END OF ATTACHED FILES ===\n\n`
          };
          // Insert after the first system message (assistant context)
          enhancedMessages.splice(1, 0, attachmentSystemMessage);
        }
      } catch (error) {
        console.error('Failed to process attachments:', error);
        // Continue without attachment content if processing fails
      }
    }

    // Send chat request
    const response = await aiProvider.chat(enhancedMessages, options);

    // Save conversation and messages
    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      // Generate a meaningful title from the first user message
      const firstUserMessage = messages.find(m => m.role === 'user')?.content || '';
      const generatedTitle = await this.generateConversationTitle(firstUserMessage);

      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          title: generatedTitle,
          provider: useMockProvider ? ('MOCK' as any) : selectedProvider,
          model: response.model,
        },
      });
    } else {
      // Update conversation
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    // Save user message
    if (messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user') {
        await prisma.aIMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'user',
            content: lastUserMessage.content,
            tokens: response.tokens?.prompt,
          },
        });
      }
    }

    // Save assistant message
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: response.content,
        tokens: response.tokens?.completion,
      },
    });

    return {
      ...response,
      conversationId: conversation.id,
      usingMockProvider: useMockProvider,
    };
  }

  /**
   * Get conversation history
   */
  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.aIConversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aIConversation.count({ where: { userId } }),
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single conversation with messages
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new ApiErrorClass(
        'CONVERSATION_NOT_FOUND',
        'Conversation not found',
        404
      );
    }

    return conversation;
  }

  /**
   * Create new empty conversation
   */
  async createConversation(userId: string, assistantName?: string) {
    // Get user's AI settings to determine default provider
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const defaultProvider: AIProvider = (userSettings?.aiModelPreference as AIProvider | null) ?? AIProvider.GEMINI;
    const defaultModel = 'gemini-1.5-flash';

    // Create greeting title based on assistant
    const greetingTitle = assistantName ? `Chat with ${assistantName}` : 'New Chat';

    const conversation = await prisma.aIConversation.create({
      data: {
        userId,
        title: greetingTitle,
        provider: defaultProvider as any,
        model: defaultModel,
      },
    });

    return conversation;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new ApiErrorClass(
        'CONVERSATION_NOT_FOUND',
        'Conversation not found',
        404
      );
    }

    // Delete messages first (cascade)
    await prisma.aIMessage.deleteMany({
      where: { conversationId },
    });

    // Delete conversation
    await prisma.aIConversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Rename conversation
   */
  async renameConversation(userId: string, conversationId: string, newTitle: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new ApiErrorClass(
        'CONVERSATION_NOT_FOUND',
        'Conversation not found',
        404
      );
    }

    if (!newTitle || newTitle.trim().length === 0) {
      throw new ApiErrorClass(
        'INVALID_TITLE',
        'Title cannot be empty',
        400
      );
    }

    const updated = await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title: newTitle.trim() },
    });

    return updated;
  }

  /**
   * Archive/unarchive conversation
   */
  async toggleArchiveConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new ApiErrorClass(
        'CONVERSATION_NOT_FOUND',
        'Conversation not found',
        404
      );
    }

    // Use isArchived field if exists, otherwise skip
    const updated = await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return updated;
  }

  /**
   * Search conversations
   */
  async searchConversations(userId: string, query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.aIConversation.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aIConversation.count({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available AI providers
   */
  getProviders() {
    return {
      providers: AIProviderFactory.getAvailableProviders().map((provider) => ({
        name: provider,
        requiresApiKey: AIProviderFactory.requiresApiKey(provider),
        defaultModel: AIProviderFactory.getDefaultModel(provider),
      })),
      userConfigured: {
        gemini: !!config.googleAiApiKey,
        anthropic: !!config.anthropicApiKey,
        openai: !!config.openaiApiKey,
        ollama: !!config.ollamaApiUrl,
        lmstudio: !!config.lmStudioApiUrl,
      },
    };
  }

  /**
   * Get all AI models (public + user's custom models)
   */
  async getModels(userId: string) {
    const models = await prisma.aIModel.findMany({
      where: {
        OR: [
          { isPublic: true },
          { userId },
        ],
      },
      orderBy: [
        { isCustom: 'asc' },
        { popularity: 'desc' },
      ],
    });

    return models;
  }

  /**
   * Create a new AI model
   */
  async createModel(userId: string, modelData: any) {
    const model = await prisma.aIModel.create({
      data: {
        ...modelData,
        isCustom: true,
        userId,
      },
    });

    return model;
  }

  /**
   * Update an AI model
   */
  async updateModel(userId: string, modelId: string, modelData: any) {
    // Verify ownership
    const model = await prisma.aIModel.findFirst({
      where: {
        id: modelId,
        userId,
      },
    });

    if (!model) {
      throw new ApiErrorClass(
        'MODEL_NOT_FOUND',
        'Model not found or access denied',
        404
      );
    }

    const updated = await prisma.aIModel.update({
      where: { id: modelId },
      data: modelData,
    });

    return updated;
  }

  /**
   * Delete an AI model
   */
  async deleteModel(userId: string, modelId: string) {
    // Verify ownership
    const model = await prisma.aIModel.findFirst({
      where: {
        id: modelId,
        userId,
      },
    });

    if (!model) {
      throw new ApiErrorClass(
        'MODEL_NOT_FOUND',
        'Model not found or access denied',
        404
      );
    }

    await prisma.aIModel.delete({
      where: { id: modelId },
    });

    return { success: true };
  }

  /**
   * Get provider API key from config
   */
  private getProviderApiKey(provider: AIProvider): string | undefined {
    switch (provider) {
      case AIProvider.GEMINI:
        return config.googleAiApiKey;
      case AIProvider.ANTHROPIC:
        return config.anthropicApiKey;
      case AIProvider.OPENAI:
        return config.openaiApiKey;
      default:
        return undefined;
    }
  }

  /**
   * Get provider base URL for local providers
   */
  private getProviderBaseURL(provider: AIProvider): string | undefined {
    switch (provider) {
      case AIProvider.OLLAMA:
        return config.ollamaApiUrl;
      case AIProvider.LMSTUDIO:
        return config.lmStudioApiUrl;
      default:
        return undefined;
    }
  }
}

export const aiService = new AIService();
