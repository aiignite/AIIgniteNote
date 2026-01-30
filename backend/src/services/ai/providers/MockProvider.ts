import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse } from '../../../types';

export class MockProvider extends BaseAIProvider {
  name = 'MOCK' as any;

  constructor(config: AIProviderConfig) {
    super(config);
  }

  async chat(_messages: ChatMessage[], _options?: ChatOptions): Promise<AIResponse> {
    return {
      content: 'This is a mock response because the selected provider is unavailable.',
      model: this.config.model || 'mock-model',
      provider: this.name,
    };
  }

  async *streamChat(_messages: ChatMessage[], _options?: ChatOptions): AsyncGenerator<string> {
    const text = 'This is a mock response from the Mock provider.';
    yield text;
  }

  protected formatMessages(messages: ChatMessage[]) {
    return messages;
  }

  protected formatResponse(response: any): AIResponse {
    return {
      content: response,
      model: 'mock',
      provider: this.name,
    };
  }
}
