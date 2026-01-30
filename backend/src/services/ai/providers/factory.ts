import { IAIProvider, AIProviderConfig } from './base';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';
import { LMStudioProvider } from './LMStudioProvider';
import { MockProvider } from './MockProvider';
import { AIProvider } from '../../../types';

/**
 * AI Provider Factory
 * Creates AI provider instances based on provider type
 */
export class AIProviderFactory {
  /**
   * Create an AI provider instance
   */
  static create(provider: AIProvider, config: AIProviderConfig): IAIProvider {
    switch (provider) {
      case AIProvider.GEMINI:
        return new GeminiProvider(config);
      case AIProvider.ANTHROPIC:
        return new AnthropicProvider(config);
      case AIProvider.OPENAI:
        return new OpenAIProvider(config);
      case AIProvider.OLLAMA:
        return new OllamaProvider(config);
      case AIProvider.LMSTUDIO:
        return new LMStudioProvider(config);
      case 'MOCK' as AIProvider:
        return new MockProvider(config);
      default:
        throw new Error(`Provider ${provider} not configured or unsupported`);
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): AIProvider[] {
    return [...Object.values(AIProvider)];
  }

  /**
   * Check if a provider requires API key
   */
  static requiresApiKey(provider: AIProvider): boolean {
    return ![AIProvider.OLLAMA, AIProvider.LMSTUDIO].includes(provider);
  }

  /**
   * Get default model for a provider
   */
  static getDefaultModel(provider: AIProvider): string {
    const defaults: Record<string, string> = {
      [AIProvider.GEMINI]: 'gemini-2.0-flash-exp',
      [AIProvider.ANTHROPIC]: 'claude-sonnet-4-20250514',
      [AIProvider.OPENAI]: 'gpt-4o',
      [AIProvider.OLLAMA]: 'llama3.2',
      [AIProvider.LMSTUDIO]: 'local-model'
    };
    return defaults[provider] || '';
  }
}
