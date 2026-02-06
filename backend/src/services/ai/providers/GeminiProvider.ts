import { BaseAIProvider, AIProviderConfig } from './base';
import { ChatMessage, ChatOptions, AIResponse, AIProvider, MessageContent } from '../../../types';

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

  /**
   * Format content for Gemini API (supports multimodal)
   * Gemini uses "parts" array with text and inlineData for images
   */
  private formatPartsForGemini(content: MessageContent): any[] {
    if (typeof content === 'string') {
      return [{ text: content }];
    }
    
    // Handle array of content parts (multimodal)
    return content.map(part => {
      if (part.type === 'text') {
        return { text: part.text };
      } else if (part.type === 'image') {
        return {
          inlineData: {
            mimeType: part.mimeType,
            data: part.data
          }
        };
      }
      return { text: '' };
    }).filter(p => p.text !== '' || p.inlineData);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const model = options?.model || this.config.model || 'gemini-pro';

    // Format messages for Gemini API with multimodal support
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: this.formatPartsForGemini(msg.content),
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

    // Format messages for Gemini API with multimodal support
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: this.formatPartsForGemini(msg.content),
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

        // Gemini sends data as a continuous stream contained within [ ]
        // We need to handle:
        // 1. Initial [ and commas between objects
        // 2. Objects being split across chunks
        // 3. Multiple objects in one chunk
        
        let changed = true;
        while (changed) {
          changed = false;
          
          // Remove leading [ if present at the very beginning of the stream
          buffer = buffer.trim();
          if (buffer.startsWith('[')) {
            buffer = buffer.substring(1).trim();
            changed = true;
          }
          
          // Remove leading , between objects
          if (buffer.startsWith(',')) {
            buffer = buffer.substring(1).trim();
            changed = true;
          }

          // Try to find and parse a complete JSON object
          let braceCount = 0;
          let jsonStart = -1;
          let jsonEnd = -1;
          let inString = false;
          let escaped = false;

          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            
            if (char === '"' && !escaped) {
              inString = !inString;
            }
            
            if (char === '\\' && !escaped) {
              escaped = true;
            } else {
              escaped = false;
            }

            if (!inString) {
              if (char === '{') {
                if (braceCount === 0) jsonStart = i;
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && jsonStart >= 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
          }

          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const jsonStr = buffer.substring(jsonStart, jsonEnd);
            buffer = buffer.substring(jsonEnd).trim();
            changed = true;

            try {
              const data = JSON.parse(jsonStr);
              // Gemini streaming response: { "candidates": [ { "content": { "parts": [ { "text": "..." } ] } } ] }
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

              if (text) {
                yield text;
              }
            } catch (e) {
              console.error('[GeminiProvider] Failed to parse JSON chunk:', jsonStr);
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
