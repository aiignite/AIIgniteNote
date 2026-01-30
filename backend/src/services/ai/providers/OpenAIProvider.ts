import OpenAI from 'openai';
import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider } from '../../../types';

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

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.config.model || 'gpt-4-turbo-preview',
      messages: messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
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

  protected formatMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
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
