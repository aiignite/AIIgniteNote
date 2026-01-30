import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider } from '../../../types';

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

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
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
