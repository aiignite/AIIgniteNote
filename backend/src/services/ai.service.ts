import { prisma } from '../config/database';
import { AIProviderFactory } from './ai';
import { AIProvider, ChatMessage, ChatOptions } from '../types';
import { ApiErrorClass } from '../utils/response';
import { config } from '../config';
import { attachmentService } from './attachment.service';

// 支持视觉功能的模型列表（通过模型ID匹配，不区分大小写）
const VISION_CAPABLE_MODELS = [
  // OpenAI
  'gpt-4-vision',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4.1',
  'gpt-4.5',
  'o1',
  'o3',
  'o4',
  // Google
  'gemini-pro-vision',
  'gemini-1.5',
  'gemini-2',
  'gemini-exp',
  // Anthropic
  'claude-3',
  'claude-3.5',
  'claude-4',
  // Alibaba Qwen
  'qwen-vl',
  'qwen2-vl',
  'qwen2.5-vl',
  'qwen-max-vl',
  'qwen-plus-vl',
  // Local vision models
  'llava',
  'bakllava',
  'cogvlm',
  'internvl',
  'moondream',
  'obsidian',
  'minicpm-v',
  'yi-vl',
  'deepseek-vl',
  'pixtral',
  // Vision suffix patterns
  'vision',
  '-vl',
  '-vl-',
];

function getMessageText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text || '')
      .join('\n');
  }
  return String(content);
}

/**
 * 检查模型是否支持视觉功能
 */
function isVisionCapableModel(modelId: string | undefined): boolean {
  if (!modelId) return false;
  const lowerModelId = modelId.toLowerCase();
  return VISION_CAPABLE_MODELS.some(pattern => lowerModelId.includes(pattern.toLowerCase()));
}

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
    attachmentIds?: string[],
    directImages?: string[]
  ): AsyncGenerator<any> {
    // Get user's AI settings if available
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Determine which provider and config to use
    let selectedProvider = provider;
    let apiKey = this.getProviderApiKey(selectedProvider as AIProvider);
    let baseURL = this.getProviderBaseURL(selectedProvider as AIProvider);
    let customModel = null;

    // 1. If a specific model is requested, try to find it first (across all providers if necessary)
    if (options?.model) {
      // Build where clause correctly
      const whereClause: any = {
        modelId: options.model,
        OR: [{ userId }, { isPublic: true }]
      };
      if (selectedProvider) {
        whereClause.provider = selectedProvider;
      }

      customModel = await prisma.aIModel.findFirst({
        where: whereClause,
        orderBy: { isCustom: 'desc' } // Prefer user's custom models
      });

      // If not found with specific provider, search by modelId only
      if (!customModel && selectedProvider) {
        customModel = await prisma.aIModel.findFirst({
          where: {
            modelId: options.model,
            OR: [{ userId }, { isPublic: true }]
          },
          orderBy: { isCustom: 'desc' }
        });
      }

      if (customModel) {
        selectedProvider = customModel.provider as AIProvider;
        if (customModel.apiKey) apiKey = customModel.apiKey;
        if (customModel.endpoint) baseURL = customModel.endpoint;
        console.log(`[chatStream] Resolved model: ${customModel.name}, provider: ${selectedProvider}`);
      }
    }

    // 2. Final fallbacks for provider and config
    if (!selectedProvider) {
      selectedProvider = (userSettings?.aiModelPreference as AIProvider) || AIProvider.GEMINI;
      // If we chose a fallback provider, update apikey/baseurl
      if (!apiKey) apiKey = this.getProviderApiKey(selectedProvider);
      if (!baseURL) baseURL = this.getProviderBaseURL(selectedProvider);
    }

    // 3. Fallback to any model's provider if default provider has no config
    if (!apiKey && !baseURL && !customModel) {
        const anyConfiguredModel = await prisma.aIModel.findFirst({
            where: {
              OR: [
                { userId },
                { isPublic: true }
              ]
            },
            orderBy: { isCustom: 'desc' }
        });
        if (anyConfiguredModel) {
            selectedProvider = anyConfiguredModel.provider as AIProvider;
            apiKey = anyConfiguredModel.apiKey || this.getProviderApiKey(selectedProvider);
            baseURL = anyConfiguredModel.endpoint || this.getProviderBaseURL(selectedProvider);
            console.log(`[chatStream] Fallback to configured model: ${anyConfiguredModel.name}, provider: ${selectedProvider}`);
        }
    }

    console.log(`[chatStream] Final: provider="${selectedProvider}", baseURL="${baseURL}", apiKey=${apiKey ? 'SET' : 'EMPTY'}`);

    // Create provider instance
    let aiProvider = AIProviderFactory.create(selectedProvider, {
      apiKey,
      baseURL,
      model: options?.model,
    });

    console.log(`[chatStream] AI provider created: ${selectedProvider}. Supports streaming: ${!!aiProvider.streamChat}`);

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

    // Process attachments if provided - 支持图像处理
    let enhancedMessages = [...messages];
    let allImages: { mimeType: string; data: string }[] = [];

    // 从 attachmentIds 获取图片
    if (attachmentIds && attachmentIds.length > 0) {
      try {
        const { texts, images } = await attachmentService.getAttachmentsForAI(attachmentIds);

        // 处理文本附件
        if (texts.length > 0) {
          const attachmentSystemMessage: ChatMessage = {
            role: 'system',
            content: `\n\n=== ATTACHED FILES CONTENT ===\n\n${texts.join('\n\n')}\n\n=== END OF ATTACHED FILES ===\n\n`
          };
          enhancedMessages.splice(1, 0, attachmentSystemMessage);
        }

        // 收集图片
        allImages = [...allImages, ...images];
      } catch (error) {
        console.error('Failed to process attachments:', error);
      }
    }

    // 处理直接传入的 base64 图片
    if (directImages && directImages.length > 0) {
      for (const base64Image of directImages) {
        // 解析 base64 数据，提取 mimeType 和 data
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          allImages.push({
            mimeType: match[1],
            data: match[2]
          });
        } else {
          // 如果没有 data URI 前缀，默认为 image/jpeg
          allImages.push({
            mimeType: 'image/jpeg',
            data: base64Image
          });
        }
      }
    }

    // 处理所有收集到的图片
    if (allImages.length > 0) {
      const currentModel = options?.model || customModel?.modelId;
      const modelSupportsImage = typeof (customModel as any)?.supportsImage === 'boolean'
        ? (customModel as any).supportsImage
        : undefined;
      const isVisionCapable = modelSupportsImage ?? isVisionCapableModel(currentModel);

      // 检查模型是否支持视觉功能
      if (!isVisionCapable) {
        console.warn(`[chatStream] Model "${currentModel}" does not support vision. Adding image as text notice.`);
        // 不支持视觉的模型：将图像信息添加为文本提示
        const imageNotice: ChatMessage = {
          role: 'system',
          content: `\n\n[注意：用户上传了 ${allImages.length} 张图片，但当前模型 "${currentModel}" 不支持图像识别。请建议用户选择支持视觉的模型（如 Qwen2.5 VL、GPT-4V、Claude 3、Gemini 1.5 等）来处理图像内容。]\n\n`
        };
        enhancedMessages.splice(1, 0, imageNotice);
      } else {
        console.log(`[chatStream] Processing ${allImages.length} images for multimodal AI (model: ${currentModel})`);

        // 找到最后一条用户消息
        const lastUserMsgIndex = enhancedMessages.map(m => m.role).lastIndexOf('user');
        if (lastUserMsgIndex >= 0) {
          const lastUserMsg = enhancedMessages[lastUserMsgIndex];
          const originalContent = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '';

          // 构建多模态内容
          const multimodalContent: any[] = [
            { type: 'text', text: originalContent }
          ];

          for (const img of allImages) {
            multimodalContent.push({
              type: 'image',
              mimeType: img.mimeType,
              data: img.data
            });
          }

          enhancedMessages[lastUserMsgIndex] = {
            ...lastUserMsg,
            content: multimodalContent
          };
        }
      }
    }

    // Create conversation if not exists
    let currentConversationId = conversationId;
    let conversation: any = null;

    if (!conversationId) {
      const firstUserMessage = getMessageText(messages.find(m => m.role === 'user')?.content || '');
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
            content: getMessageText(lastUserMessage.content),
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
      console.log('[chatStream] Starting to iterate over stream...');

      let chunkCount = 0;
      try {
        for await (const chunk of stream) {
          chunkCount++;
          fullResponse += chunk;
          console.log(`[chatStream] Chunk #${chunkCount}: "${chunk.substring(0, 30)}..." (fullResponse length: ${fullResponse.length})`);
          yield {
            content: chunk,
            done: false,
            conversationId: currentConversationId
          };
        }
        console.log(`[chatStream] Stream complete. Total chunks: ${chunkCount}, Full response length: ${fullResponse.length}`);
      } catch (streamError: any) {
        console.error('[chatStream] Stream error:', streamError);
        try {
          const response = await aiProvider.chat(enhancedMessages, options);
          const fallbackText = response.content || '';
          fullResponse = fallbackText;

          const chunkSize = 10;
          for (let i = 0; i < fallbackText.length; i += chunkSize) {
            const chunk = fallbackText.slice(i, i + chunkSize);
            yield {
              content: chunk,
              done: false,
              conversationId: currentConversationId
            };
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        } catch (fallbackError: any) {
          console.error('[chatStream] Fallback chat error:', fallbackError);
          yield {
            content: '',
            done: true,
            error: fallbackError.message || streamError.message || 'Stream interrupted',
            conversationId: currentConversationId
          };
          return; // 停止生成器
        }
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

    // Save assistant message (with error handling)
    if (currentConversationId && fullResponse) {
      try {
        await prisma.aIMessage.create({
          data: {
            conversationId: currentConversationId,
            role: 'assistant',
            content: fullResponse,
          },
        });
      } catch (dbError) {
        console.error('[chatStream] Failed to save assistant message:', dbError);
        // 继续执行，不中断流程
      }
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
    attachmentIds?: string[],
    directImages?: string[]
  ) {
    // Get user's AI settings if available
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Determine which provider and config to use
    let selectedProvider = provider;
    let apiKey = this.getProviderApiKey(selectedProvider as AIProvider);
    let baseURL = this.getProviderBaseURL(selectedProvider as AIProvider);
    let customModel = null;

    // 1. If a specific model is requested, try to find it first (across all providers if necessary)
    if (options?.model) {
      // Build where clause correctly
      const whereClause: any = {
        modelId: options.model,
        OR: [{ userId }, { isPublic: true }]
      };
      if (selectedProvider) {
        whereClause.provider = selectedProvider;
      }

      customModel = await prisma.aIModel.findFirst({
        where: whereClause,
        orderBy: { isCustom: 'desc' } // Prefer user's custom models
      });

      // If not found with specific provider, search by modelId only
      if (!customModel && selectedProvider) {
        customModel = await prisma.aIModel.findFirst({
          where: {
            modelId: options.model,
            OR: [{ userId }, { isPublic: true }]
          },
          orderBy: { isCustom: 'desc' }
        });
      }

      if (customModel) {
        selectedProvider = customModel.provider as AIProvider;
        if (customModel.apiKey) apiKey = customModel.apiKey;
        if (customModel.endpoint) baseURL = customModel.endpoint;
        console.log(`[chat] Resolved model: ${customModel.name}, provider: ${selectedProvider}`);
      }
    }

    // 2. Final fallbacks for provider and config
    if (!selectedProvider) {
      selectedProvider = (userSettings?.aiModelPreference as AIProvider) || AIProvider.GEMINI;
      // If we chose a fallback provider, update apikey/baseurl
      if (!apiKey) apiKey = this.getProviderApiKey(selectedProvider);
      if (!baseURL) baseURL = this.getProviderBaseURL(selectedProvider);
    }

    // 3. Fallback to any model's provider if default provider has no config
    if (!apiKey && !baseURL && !customModel) {
        const anyConfiguredModel = await prisma.aIModel.findFirst({
            where: {
              OR: [
                { userId },
                { isPublic: true }
              ]
            },
            orderBy: { isCustom: 'desc' }
        });
        if (anyConfiguredModel) {
            selectedProvider = anyConfiguredModel.provider as AIProvider;
            apiKey = anyConfiguredModel.apiKey || this.getProviderApiKey(selectedProvider);
            baseURL = anyConfiguredModel.endpoint || this.getProviderBaseURL(selectedProvider);
            console.log(`[chat] Fallback to configured model: ${anyConfiguredModel.name}, provider: ${selectedProvider}`);
        }
    }

    console.log(`[chat] Final: provider="${selectedProvider}", baseURL="${baseURL}", apiKey=${apiKey ? 'SET' : 'EMPTY'}`);

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
    let allImages: { mimeType: string; data: string }[] = [];

    if (attachmentIds && attachmentIds.length > 0) {
      try {
        const { texts, images } = await attachmentService.getAttachmentsForAI(attachmentIds);

        if (texts.length > 0) {
          const attachmentSystemMessage: ChatMessage = {
            role: 'system',
            content: `\n\n=== ATTACHED FILES CONTENT ===\n\n${texts.join('\n\n')}\n\n=== END OF ATTACHED FILES ===\n\n`
          };
          enhancedMessages.splice(1, 0, attachmentSystemMessage);
        }

        allImages = [...allImages, ...images];
      } catch (error) {
        console.error('Failed to process attachments:', error);
      }
    }

    if (directImages && directImages.length > 0) {
      for (const base64Image of directImages) {
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          allImages.push({
            mimeType: match[1],
            data: match[2]
          });
        } else {
          allImages.push({
            mimeType: 'image/jpeg',
            data: base64Image
          });
        }
      }
    }

    if (allImages.length > 0) {
      const currentModel = options?.model || customModel?.modelId;
      const modelSupportsImage = typeof (customModel as any)?.supportsImage === 'boolean'
        ? (customModel as any).supportsImage
        : undefined;
      const isVisionCapable = modelSupportsImage ?? isVisionCapableModel(currentModel);

      if (!isVisionCapable) {
        console.warn(`[chat] Model "${currentModel}" does not support vision.`);
        const imageNotice: ChatMessage = {
          role: 'system',
          content: `\n\n[注意：用户上传了 ${allImages.length} 张图片，但当前模型 "${currentModel}" 不支持图像识别。]\n\n`
        };
        enhancedMessages.splice(1, 0, imageNotice);
      } else {
        console.log(`[chat] Processing ${allImages.length} images for multimodal AI`);

        const lastUserMsgIndex = enhancedMessages.map(m => m.role).lastIndexOf('user');
        if (lastUserMsgIndex >= 0) {
          const lastUserMsg = enhancedMessages[lastUserMsgIndex];
          const originalContent = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '';

          const multimodalContent: any[] = [
            { type: 'text', text: originalContent }
          ];

          for (const img of allImages) {
            multimodalContent.push({
              type: 'image',
              mimeType: img.mimeType,
              data: img.data
            });
          }

          enhancedMessages[lastUserMsgIndex] = {
            ...lastUserMsg,
            content: multimodalContent
          };
        }
      }
    }

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
      const firstUserMessage = getMessageText(messages.find(m => m.role === 'user')?.content || '');
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
            content: getMessageText(lastUserMessage.content),
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

    // Try to find ANY available model to avoid defaulting to Gemini unnecessarily
    const anyModel = await prisma.aIModel.findFirst({
      where: {
        OR: [
          { userId },
          { isPublic: true }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });

    const defaultProvider: AIProvider = (userSettings?.aiModelPreference as AIProvider | null) 
      ?? (anyModel?.provider as AIProvider) 
      ?? AIProvider.GEMINI;
    
    let resolvedModel: string | undefined = userSettings?.defaultAIModel || anyModel?.modelId || undefined;

    // Create greeting title based on assistant
    const greetingTitle = assistantName ? `Chat with ${assistantName}` : 'New Chat';

    const conversation = await prisma.aIConversation.create({
      data: {
        userId,
        title: greetingTitle,
        provider: defaultProvider as any,
        ...(resolvedModel ? { model: resolvedModel } : {}),
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
      select: {
        id: true,
        name: true,
        modelId: true,
        provider: true,
        endpoint: true,
        popularity: true,
        isPublic: true,
        isCustom: true,
        speed: true,
        cost: true,
        context: true,
        description: true,
        supportsText: true,
        supportsImage: true,
        defaultTemplateId: true,
        userId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        // Note: apiKey is intentionally excluded for security
      },
    });

    return models;
  }

  /**
   * Create a new AI model
   */
  async createModel(userId: string, modelData: any) {
    // Remove invalid foreign key fields
    const { defaultTemplateId, default_template_id, ...cleanData } = modelData;
    
    // Build the data object
    const dataToCreate: any = {
      ...cleanData,
      isCustom: true,
      userId,
    };
    
    // Handle endpoint: convert empty string to null
    if (dataToCreate.endpoint === '') {
      dataToCreate.endpoint = null;
    }
    
    // Handle apiKey: convert empty string to null
    if (dataToCreate.apiKey === '') {
      dataToCreate.apiKey = null;
    }
    
    // Only add defaultTemplateId if it's provided, not empty, and exists
    const templateId = defaultTemplateId || default_template_id;
    if (templateId && templateId.trim() !== '') {
      const template = await prisma.aITemplate.findUnique({
        where: { id: templateId },
      });
      
      if (template) {
        dataToCreate.defaultTemplateId = templateId;
      }
    }
    
    const model = await prisma.aIModel.create({
      data: dataToCreate,
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

    // Build the update data object, excluding defaultTemplateId/default_template_id initially
    const { defaultTemplateId, default_template_id, ...updateData } = modelData;
    
    // Handle endpoint: convert empty string to null
    if (updateData.endpoint === '') {
      updateData.endpoint = null;
    }
    
    // Handle apiKey: convert empty string to null
    if (updateData.apiKey === '') {
      updateData.apiKey = null;
    }
    
    // Handle defaultTemplateId: only process if explicitly provided
    const templateId = defaultTemplateId !== undefined ? defaultTemplateId : default_template_id;
    
    if (templateId !== undefined) {
      if (templateId === '' || templateId === null) {
        // Clear the template
        updateData.defaultTemplateId = null;
      } else {
        // Verify template exists before setting
        const template = await prisma.aITemplate.findUnique({
          where: { id: templateId },
        });
        
        if (template) {
          updateData.defaultTemplateId = templateId;
        } else {
          // Template doesn't exist, set to null instead of keeping invalid FK
          updateData.defaultTemplateId = null;
        }
      }
    }
    // If templateId is undefined, don't modify defaultTemplateId in the update

    const updated = await prisma.aIModel.update({
      where: { id: modelId },
      data: updateData,
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
