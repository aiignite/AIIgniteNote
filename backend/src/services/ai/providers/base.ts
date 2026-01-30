import { AIProvider as AIProviderEnum, ChatMessage, ChatOptions, AIResponse } from '../../../types';

/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
export interface IAIProvider {
  /**
   * Provider name
   */
  name: AIProviderEnum;

  /**
   * Send a chat request and get response
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;

  /**
   * Stream chat response (optional)
   */
  streamChat?(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Base configuration for AI providers
 */
export interface AIProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
}

/**
 * Base AI Provider class with common utilities
 */
export abstract class BaseAIProvider implements IAIProvider {
  abstract name: AIProviderEnum;
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;

  async isAvailable(): Promise<boolean> {
    // We assume availability if the provider was constructed successfully
    // The constructor should handle validation of required config (like API keys)
    return true;
  }

  /**
   * Format messages for the specific provider
   */
  protected abstract formatMessages(messages: ChatMessage[]): any;

  /**
   * Format response to standard AIResponse
   */
  protected abstract formatResponse(response: any): AIResponse;
}
