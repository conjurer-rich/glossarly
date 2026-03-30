/**
 * Infra Adapters - Infrastructure implementations of domain interfaces
 */

// Persistence adapters
export {
  PostgresTermDefinitionRepository,
} from './persistence/postgresql/term-definition.postgres-repository';

export { RedisTermCache } from './persistence/redis/term-cache.redis';

// External services adapters
export {
  ILLMProvider,
  EnrichTermRequest,
  EnrichTermResult,
} from './external-services/llm/llm-provider.interface';

export { OpenAIProvider } from './external-services/llm/openai-provider';

export { AnthropicProvider } from './external-services/llm/anthropic-provider';

export {
  createLLMProvider,
  type LLMConfig,
} from './external-services/llm/llm-config';

// Event bus adapters
export { IEventBus } from './event-bus/event-bus.interface';

export { InMemoryEventBus } from './event-bus/in-memory-event-bus';
