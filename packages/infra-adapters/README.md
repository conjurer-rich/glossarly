# Infra Adapters - Glossarly

Infrastructure adapters implementing domain interfaces with concrete technologies for the Glossarly project.

## Structure

### Persistence Layer

#### PostgreSQL Repository (`persistence/postgresql/`)
- **term-definition.postgres-repository.ts** - Implements `ITermDefinitionRepository` for PostgreSQL
  - `save()` - INSERT ... ON CONFLICT UPDATE
  - `findById()` - Retrieve by ID
  - `findByTerm()` - Case-insensitive term search
  - `searchTerms()` - Full-text search with ILIKE
  - `findByCategory()` - Filter by category
  - `bulkSave()` - Transactional bulk operations
  - `delete()` - Remove by ID

- **migrations/001_create_terms_table.sql** - Database schema with indexes
  - UUID primary key
  - Full-text search support via GIN index
  - Confidence validation (0-100)
  - Timestamp tracking

#### Redis Cache (`persistence/redis/`)
- **term-cache.redis.ts** - Implements `ITermCache` for Redis
  - `get()` - Retrieve cached term with JSON deserialization
  - `set()` - Store with configurable TTL (default 24 hours)
  - `invalidate()` - Delete specific cache entry
  - `clear()` - Scan and delete all glossarly keys

### External Services Layer

#### LLM Providers (`external-services/llm/`)
- **openai-provider.ts** - OpenAI implementation of `ILLMProvider`
  - Uses GPT-4o model (configurable)
  - JSON-mode structured responses
  - Token counting via usage field
  - Error wrapping in `ExternalServiceError`

- **anthropic-provider.ts** - Anthropic implementation of `ILLMProvider`
  - Uses Claude Sonnet 4 (configurable)
  - JSON response formatting
  - Input + output token counting
  - Error wrapping in `ExternalServiceError`

- **llm-config.ts** - Factory pattern for provider instantiation
  - Configuration-driven provider selection
  - Support for openai | anthropic
  - Optional model override per provider

- **llm-provider.interface.ts** - Re-exports of domain LLM types

### Event Bus Layer

#### In-Memory Event Bus (`event-bus/`)
- **event-bus.interface.ts** - `IEventBus` contract definition
  - `publish()` - Single event publishing
  - `publishAll()` - Batch event publishing
  - `subscribe()` - Handler registration by event type

- **in-memory-event-bus.ts** - In-memory implementation
  - Map-based handler storage
  - Sequential event processing
  - Error isolation per handler
  - Suitable for testing and development

## Dependencies

- `@glossarly/domain` - Domain layer with aggregate roots and interfaces
- `@glossarly/shared` - Shared types and API contracts
- `pg` - PostgreSQL client for persistence
- `ioredis` - Redis client for caching
- `fetch` API - HTTP client (built-in for Node.js 18+)

## Configuration Examples

### PostgreSQL Setup
```typescript
import { Pool } from 'pg';
import { PostgresTermDefinitionRepository } from '@glossarly/infra-adapters';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const repository = new PostgresTermDefinitionRepository(pool);
```

### Redis Setup
```typescript
import Redis from 'ioredis';
import { RedisTermCache } from '@glossarly/infra-adapters';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const cache = new RedisTermCache(redis);
```

### LLM Provider Setup
```typescript
import { createLLMProvider } from '@glossarly/infra-adapters';

const provider = createLLMProvider({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// Or using Anthropic
const anthropicProvider = createLLMProvider({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
});
```

### Event Bus Setup
```typescript
import { InMemoryEventBus } from '@glossarly/infra-adapters';

const eventBus = new InMemoryEventBus();

// Subscribe to events
eventBus.subscribe('TermCreated', async (event) => {
  console.log('Term created:', event);
});

// Publish events
await eventBus.publish(termCreatedEvent);
```

## Error Handling

All implementations follow consistent error handling:

- **DomainError** - Raised for business logic violations
- **ExternalServiceError** - Raised for LLM provider failures (wrapped with provider name)
- Error messages include context and original error details

## Testing

Configuration uses ts-jest with module name mapping for monorepo support:

```bash
npm test
```

Jest config located at `jest.config.js` with proper path aliases for shared and domain packages.
