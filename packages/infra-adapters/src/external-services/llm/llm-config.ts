import { ILLMProvider } from '@glossarly/domain';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

/**
 * Configuration for creating an LLM provider.
 */
export interface LLMConfig {
  /** LLM provider type */
  provider: 'openai' | 'anthropic';
  /** API key for the provider */
  apiKey: string;
  /** Optional model identifier (uses provider default if not specified) */
  model?: string;
}

/**
 * Factory function to create an LLM provider based on configuration.
 * Supports OpenAI and Anthropic providers.
 *
 * @param config - Configuration object specifying provider and credentials
 * @returns The configured LLM provider instance
 * @throws Error if provider is unsupported or credentials are missing
 */
export function createLLMProvider(config: LLMConfig): ILLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.model);
    default:
      throw new Error(
        `Unsupported LLM provider: ${config.provider}. Supported providers: openai, anthropic`
      );
  }
}
