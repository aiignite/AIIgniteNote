import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider } from '../../../types';

export class GeminiProvider extends BaseAIProvider {
  name = AIProvider.GEMINI as any;
  private apiKey: string;

  constructor(config: AIProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = config.apiKey;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const model = options?.model || this.config.model || 'gemini-pro';

    // Format messages for Gemini API
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options?.maxTokens || 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Estimate tokens (Gemini doesn't provide token count in basic response)
    const promptTokens = this.estimateTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);

    return {
      content,
      model,
      provider: this.name,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    };
  }

  /**
   * Stream chat response using Gemini's streaming API
   */
  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const model = options?.model || this.config.model || 'gemini-1.5-flash';

    // Format messages for Gemini API
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    console.log('[GeminiProvider] Starting stream with model:', model);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options?.maxTokens || 8192,
            temperature: options?.temperature || 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Read the streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[GeminiProvider] Stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Gemini sends data as a continuous stream, not line-separated JSON
        // We need to parse JSON objects as they become complete
        while (true) {
          // Try to find and parse a complete JSON object
          let parsed = false;

          // Skip data: prefix if present
          let searchStart = 0;
          if (buffer.startsWith('data:')) {
            searchStart = 5; // Skip 'data:'
          }

          // Find matching braces for a complete JSON object
          let braceCount = 0;
          let jsonStart = -1;
          let jsonEnd = -1;

          for (let i = searchStart; i < buffer.length; i++) {
            if (buffer[i] === '{') {
              if (braceCount === 0) jsonStart = i;
              braceCount++;
            } else if (buffer[i] === '}') {
              braceCount--;
              if (braceCount === 0 && jsonStart >= 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }

          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            // Extract the JSON string
            const jsonStr = buffer.substring(jsonStart, jsonEnd);
            buffer = buffer.substring(jsonEnd);

            try {
              const data = JSON.parse(jsonStr);

              // Extract text from Gemini's streaming response format
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

              if (text) {
                console.log('[GeminiProvider] Yielding chunk:', text.substring(0, 20) + '...');
                yield text;
              }
              parsed = true;
            } catch (e) {
              console.debug('[GeminiProvider] Failed to parse JSON:', jsonStr.substring(0, 100));
            }
          } else {
            // No complete JSON object found, wait for more data
            break;
          }

          if (!parsed) break;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected formatMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  protected formatResponse(response: any): AIResponse {
    return {
      content: response.text || '',
      model: this.config.model || 'gemini-pro',
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
