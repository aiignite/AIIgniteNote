import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider } from '../../../types';

export class OllamaProvider extends BaseAIProvider {
  name = AIProvider.OLLAMA as any;
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || this.config.model || 'llama2',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    const content = data.message?.content || '';

    // Ollama doesn't provide token count
    const promptTokens = this.estimateTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);

    return {
      content,
      model: options?.model || this.config.model || 'llama2',
      provider: this.name,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    };
  }

  /**
   * Stream chat response using Ollama's streaming API
   */
  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.model || 'llama3';
    
    console.log('[OllamaProvider] Starting stream with model:', model);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No response body');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch (e) {
            console.error('[OllamaProvider] Failed to parse JSON chunk:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
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
      content: response.message?.content || '',
      model: this.config.model || 'llama2',
      provider: this.name,
    };
  }

  /**
   * Estimate token count (rough estimation: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
