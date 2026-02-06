import OpenAI from 'openai';
import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider, MessageContent } from '../../../types';

export class OpenAIProvider extends BaseAIProvider {
  name = AIProvider.OPENAI as any;
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 60000,
    });
  }

  /**
   * 将消息内容转换为 OpenAI 格式
   */
  private formatContentForOpenAI(content: MessageContent): any {
    if (typeof content === 'string') {
      return content;
    }
    
    // 多模态内容
    return content.map(part => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text };
      } else if (part.type === 'image') {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.mimeType};base64,${part.data}`,
            detail: 'auto'
          }
        };
      }
      return part;
    });
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.config.model || 'gpt-4-turbo-preview',
      messages: messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: this.formatContentForOpenAI(msg.content) as any,
      })),
      max_tokens: options?.maxTokens || 4096,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      model: options?.model || this.config.model || 'gpt-4-turbo-preview',
      provider: this.name,
      tokens: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Stream chat response using OpenAI's streaming API
   */
  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.model || 'gpt-4o';
    
    console.log('[OpenAIProvider] Starting stream with model:', model);

    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: this.formatContentForOpenAI(msg.content) as any,
      })),
      stream: true,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  protected formatMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: this.formatContentForOpenAI(msg.content),
    }));
  }

  protected formatResponse(response: any): AIResponse {
    return {
      content: response.choices[0]?.message?.content || '',
      model: this.config.model || 'gpt-4-turbo-preview',
      provider: this.name,
    };
  }
}
