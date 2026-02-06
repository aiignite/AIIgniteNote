import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider, MessageContent } from '../../../types';

export class LMStudioProvider extends BaseAIProvider {
  name = AIProvider.LMSTUDIO as any;
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:1234';
    this.baseURL = this.baseURL.replace(/\/v1\/?$/, '');
  }

  /**
   * Format content for LM Studio API (OpenAI compatible, supports multimodal for vision models)
   */
  private formatContentForLMStudio(content: MessageContent): any {
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array of content parts (multimodal)
    return content.map(part => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text };
      } else if (part.type === 'image') {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.mimeType};base64,${part.data}`,
          }
        };
      }
      return { type: 'text', text: '' };
    }).filter(p => p.type !== 'text' || p.text !== '');
  }

  private async resolveModelId(requestedModel?: string): Promise<string> {
    const fallbackModel = requestedModel || this.config.model || 'local-model';
    try {
      const response = await fetch(`${this.baseURL}/v1/models`);
      if (!response.ok) return fallbackModel;
      const data = await response.json() as { data?: Array<{ id?: string }> };
      const modelIds = (data.data || []).map((item) => item.id).filter(Boolean) as string[];
      if (modelIds.length === 0) return fallbackModel;
      if (requestedModel && modelIds.includes(requestedModel)) return requestedModel;
      return modelIds[0];
    } catch (error) {
      return fallbackModel;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const resolvedModel = await this.resolveModelId(options?.model || this.config.model);
    // LM Studio uses OpenAI-compatible API
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: this.formatContentForLMStudio(msg.content),
        })),
        max_tokens: options?.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LMStudioProvider] API error:', response.status, response.statusText, errorText);
      throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
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
      model: resolvedModel,
      provider: this.name,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    };
  }

  /**
   * Stream chat response using LM Studio's streaming API
   */
  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const model = await this.resolveModelId(options?.model || this.config.model);

    console.log('[LMStudioProvider] Starting stream with model:', model);
    console.log('[LMStudioProvider] Base URL:', this.baseURL);
    console.log('[LMStudioProvider] Messages count:', messages.length);
    console.log('[LMStudioProvider] First message:', JSON.stringify(messages[0], null, 2));

    const requestPayload = {
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: this.formatContentForLMStudio(msg.content),
      })),
      max_tokens: options?.maxTokens || 4096,
      stream: true,
    };

    console.log('[LMStudioProvider] Request payload:', JSON.stringify(requestPayload, null, 2));

    console.log('[LMStudioProvider] Sending request to:', `${this.baseURL}/v1/chat/completions`);
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });
    console.log('[LMStudioProvider] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LMStudioProvider] Stream API error:', response.status, response.statusText, errorText);
      throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
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
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);
            console.log('[LMStudioProvider] Received data line:', jsonStr.substring(0, 200));
            try {
              const data = JSON.parse(jsonStr);
              console.log('[LMStudioProvider] Parsed data:', JSON.stringify(data, null, 2).substring(0, 500));
              const content = data.choices?.[0]?.delta?.content || '';
              console.log('[LMStudioProvider] Extracted content:', content);
              if (content) {
                yield content;
              }
            } catch (e) {
              console.error('[LMStudioProvider] Failed to parse JSON chunk:', jsonStr);
            }
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
