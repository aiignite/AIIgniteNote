import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider } from '../../../types';

export class LMStudioProvider extends BaseAIProvider {
  name = AIProvider.LMSTUDIO as any;
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:1234';
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    // LM Studio uses OpenAI-compatible API
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || this.config.model || 'local-model',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: options?.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content || '';

    // LM Studio might not provide token count
    const promptTokens = data.usage?.prompt_tokens || this.estimateTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = data.usage?.completion_tokens || this.estimateTokens(content);

    return {
      content,
      model: options?.model || this.config.model || 'local-model',
      provider: this.name,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
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
      model: this.config.model || 'local-model',
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
