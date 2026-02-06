import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider, MessageContent } from '../../../types';

export class AnthropicProvider extends BaseAIProvider {
  name = AIProvider.ANTHROPIC as any;
  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    console.log(`[AnthropicProvider] Initializing with config: BaseURL=${config.baseURL || 'Default'}, Model=${config.model || 'Default'}`);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 60000,
    });
  }

  /**
   * Format content for Anthropic API (supports multimodal)
   * Anthropic uses array with type: "text" or type: "image" with source.type: "base64"
   */
  private formatContentForAnthropic(content: MessageContent): any {
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array of content parts (multimodal)
    return content.map(part => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text };
      } else if (part.type === 'image') {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: part.mimeType,
            data: part.data
          }
        };
      }
      return { type: 'text', text: '' };
    }).filter(p => p.type !== 'text' || p.text !== '');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: this.formatContentForAnthropic(msg.content),
      }));

    const model = options?.model || this.config.model || 'claude-3-5-sonnet-20241022';
    console.log(`[AnthropicProvider.chat] Request Details:`);
    console.log(`  - Model: ${model}`);
    console.log(`  - Messages: ${chatMessages.length}`);
    console.log(`  - System prompt: ${systemMessage ? 'Yes' : 'No'}`);
    console.log(`  - API Key: ${this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'NONE'}`);
    console.log(`  - BaseURL: ${this.config.baseURL || 'Default'}`);

    const response = await this.client.messages.create({
      model: model,
      max_tokens: options?.maxTokens || 4096,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      model: options?.model || this.config.model || 'claude-3-5-sonnet-20241022',
      provider: this.name,
      tokens: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  /**
   * Stream chat response using Anthropic's streaming API
   */
  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: this.formatContentForAnthropic(msg.content),
      }));

    const model = options?.model || this.config.model || 'claude-3-5-sonnet-20241022';

    try {
      const stream = await this.client.messages.create({
        model: model,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessage?.content,
        messages: chatMessages,
        stream: true,
      });
      
      for await (const event of stream) {
        // Handle different event types for Anthropic/GLM streaming
        if (event.type === 'content_block_delta') {
          const delta = event.delta as any;
          if (delta.type === 'text_delta' && delta.text) {
            yield delta.text;
          } else if (delta.type === 'text' && delta.text) {
            yield delta.text;
          }
        } else if (event.type === 'content_block_start') {
          const content = (event as any).content_block;
          if (content?.type === 'text' && content?.text) {
            yield content.text;
          }
        } else if (event.type === 'message_delta') {
          const delta = (event as any).delta;
          if (delta?.text) {
            yield delta.text;
          }
        }
      }
    } catch (error) {
      console.error('[AnthropicProvider.streamChat] Stream error:', error);
      throw error;
    }
  }

  protected formatMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  protected formatResponse(response: any): AIResponse {
    return {
      content: response.content[0]?.text || '',
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      provider: this.name,
    };
  }
}
