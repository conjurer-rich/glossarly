# Glossarly API

A thin NestJS application layer that wires domain logic to HTTP endpoints via CQRS architecture.

## Overview

The Glossarly API provides a RESTful interface for managing term definitions and enrichments. It leverages:
- **NestJS**: Modern TypeScript framework for building scalable server-side applications
- **CQRS**: Command Query Responsibility Segregation pattern for clear separation of concerns
- **Domain-Driven Design**: Domain logic encapsulated in separate packages
- **Clean Architecture**: Clear separation between application, domain, and infrastructure layers

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            Glossarly API (Application Layer)        │
│         - Controllers & Routes                      │
│         - Services & Mappers                        │
│         - Filters & Interceptors                    │
└──────────────┬──────────────────────────────────────┘
               │
               │ Imports
               ▼
┌──────────────────────────┬──────────────────────────┐
│   @glossarly/domain      │   @glossarly/shared      │
│   (Domain Logic)         │   (Types & Contracts)    │
└──────────────┬───────────┴────────────┬─────────────┘
               │                        │
               ├────────────────────────┤
               ▼                        ▼
        Use Cases & Aggregates   Request/Response DTOs
               │                        │
               └────────────────────────┘
                        │
                        │ Implements
                        ▼
        ┌─────────────────────────────────┐
        │  @glossarly/infra-adapters      │
        │  (Infrastructure Implementations)│
        │  - PostgresRepository           │
        │  - RedisCache                   │
        │  - LLM Providers                │
        └─────────────────────────────────┘
```

## Project Structure

```
src/
├── main.ts                              # NestJS Bootstrap
├── app.module.ts                        # Root Module
├── config/
│   ├── database.config.ts              # PostgreSQL Connection
│   ├── cache.config.ts                 # Redis Connection
│   └── llm.config.ts                   # LLM Provider Factory
├── health/
│   ├── health.controller.ts            # Health Check Endpoint
│   └── health.module.ts                # Health Module
├── modules/
│   ├── terminology/
│   │   ├── terminology.controller.ts   # Term Definition Endpoints
│   │   ├── terminology.service.ts      # Service Orchestration
│   │   ├── terminology.module.ts       # Module Configuration
│   │   └── term-definition.mapper.ts   # Aggregate -> Response Mapping
│   ├── glossary/                       # TODO: Glossary Management
│   ├── identity/                       # TODO: Authentication & Authorization
│   ├── billing/                        # TODO: Billing & Usage Tracking
│   └── analytics/                      # TODO: Analytics & Reporting
├── shared/
│   ├── filters/
│   │   ├── domain-error.filter.ts      # Domain Error Handler
│   │   ├── all-exceptions.filter.ts    # Global Exception Handler
│   │   └── index.ts
│   ├── interceptors/
│   │   ├── request-id.interceptor.ts   # Request ID Tracking
│   │   ├── logging.interceptor.ts      # Request/Response Logging
│   │   └── index.ts
│   └── pipes/
│       ├── validation.pipe.ts          # Input Validation
│       └── index.ts
├── events/                             # Event Handlers (Event Sourcing)
└── (empty directories for future modules)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose (for local development)

### Installation

```bash
cd apps/api
pnpm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Update configuration as needed:
```env
DATABASE_URL=postgresql://glossarly:glossarly@localhost:5432/glossarly
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your-key-here
```

### Running Dependencies

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### Running the Application

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start
```

The API will be available at `http://localhost:3000`

### API Documentation

Swagger documentation is available at `http://localhost:3000/api/docs`

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Terminology Management
- `POST /api/v1/terminology/define` - Define and enrich a new term
- `GET /api/v1/terminology/:termId` - Retrieve term definition by ID
- `POST /api/v1/terminology/search` - Search for terms
- `POST /api/v1/terminology/bulk-enrich` - Bulk enrich multiple terms

## Request/Response Examples

### Define a Term
```bash
POST /api/v1/terminology/define
Content-Type: application/json

{
  "term": "Microservices",
  "initialDefinition": "An architectural approach to building applications",
  "category": "ARCHITECTURE",
  "source": "USER"
}
```

Response:
```json
{
  "data": {
    "id": "uuid",
    "term": "Microservices",
    "definition": "...",
    "category": "ARCHITECTURE",
    "source": "USER",
    "examples": [...],
    "relatedTerms": [...],
    "enrichmentMetadata": {...},
    "createdAt": "2026-02-27T10:00:00Z",
    "updatedAt": "2026-02-27T10:00:00Z"
  },
  "cached": false,
  "latencyMs": 1250
}
```

### Search Terms
```bash
POST /api/v1/terminology/search
Content-Type: application/json

{
  "query": "microservices",
  "category": "ARCHITECTURE",
  "limit": 10,
  "offset": 0
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `LLM_PROVIDER` | LLM provider (openai/anthropic) | openai |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `CORS_ORIGIN` | CORS allowed origins | * |
| `LOG_LEVEL` | Log level | debug |

## Error Handling

The API implements comprehensive error handling with standardized responses:

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2026-02-27T10:00:00Z"
  }
}
```

### HTTP Status Codes
- `200 OK` - Successful GET request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - External service error (LLM provider)

## Interceptors & Filters

### Request ID Interceptor
Automatically generates a unique request ID (UUID) and includes it in response headers for tracing.

### Logging Interceptor
Logs all requests with method, path, duration, and status code for monitoring and debugging.

### Domain Error Filter
Catches domain-specific errors and maps them to appropriate HTTP responses.

### All Exceptions Filter
Catch-all handler for unhandled exceptions to prevent server crashes.

## Development

### TypeScript Configuration
The project uses a shared `tsconfig.base.json` for consistency across packages.

### CQRS Pattern
Commands and Queries are separated in the domain layer:
- **Commands**: Actions that modify state (EnrichTerm)
- **Queries**: Actions that retrieve state (GetTermDefinition)

### Dependency Injection
NestJS dependency injection is used extensively:
- Use `@Injectable()` for services
- Use `useFactory` for complex provider configuration
- Dependencies are injected via constructor

## Testing

```bash
# Unit tests
pnpm run test

# Integration tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Performance

### Caching Strategy
- Redis cache for frequently accessed term definitions
- Cache-aware enrichment to avoid redundant LLM calls
- Cache hit rate tracking in bulk operations

### Latency Tracking
- All endpoints track and return operation latency
- Used for performance monitoring and optimization

## Security

- Input validation via ValidationPipe
- CORS configuration via environment variables
- Error messages don't leak sensitive information
- Request ID tracking for audit logs

## Deployment

### Docker Support
A Dockerfile is generated by NestJS. Docker Compose is available for local development.

### Environment-Specific Configuration
- Load variables from `.env.local` or `.env`
- Use `NODE_ENV` to control behavior

## Contributing

When adding new endpoints:
1. Create controller method with proper decorators
2. Add service method for business logic
3. Implement error handling
4. Add Swagger annotations
5. Test with example requests

## Future Enhancements

- [ ] Glossary Management Module
- [ ] Authentication & Authorization Module
- [ ] Billing & Usage Tracking Module
- [ ] Analytics & Reporting Module
- [ ] WebSocket support for real-time updates
- [ ] GraphQL API alongside REST
- [ ] Rate limiting
- [ ] Request/Response caching
