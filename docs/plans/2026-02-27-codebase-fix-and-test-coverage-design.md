# Codebase Fix & Test Coverage Design

**Date:** 2026-02-27
**Status:** Approved
**Approach:** Bottom-Up (shared → domain → infra → api → extension)

## Problem Statement

The Glossarly monorepo has critical compilation errors from cross-layer contract mismatches, logic bugs, dead code, minimal test coverage, and tests that don't follow project conventions (TDD, behavior-driven, factory functions, no `let`/`beforeEach`).

## Goals

1. All packages compile cleanly (`tsc --noEmit`)
2. All tests pass and are behavior-driven with factory functions
3. Good test coverage across domain, API, and extension layers
4. Tests survive mutation testing (Stryker)
5. Unit tests only — no Docker/external service dependencies

## Design: Bottom-Up Fix by Layer

### Layer 1: `packages/shared` — Fix Type Foundations

**Problem:** `TermCategory` and `TermSource` are plain string union types with no runtime values. Domain code references them as enums (`TermCategory.TECHNOLOGY`, `TermSource.LLM_ENRICHED`) which doesn't compile.

**Decision:** Convert to `as const` objects with derived types. This gives both runtime values AND compile-time type safety.

```typescript
export const TermCategory = {
  ACRONYM: 'ACRONYM',
  JARGON: 'JARGON',
  TECHNOLOGY: 'TECHNOLOGY',
  INDUSTRY_TERM: 'INDUSTRY_TERM',
  PRODUCT_NAME: 'PRODUCT_NAME',
} as const;
export type TermCategory = (typeof TermCategory)[keyof typeof TermCategory];
```

**Values to add:**
- `TermCategory`: add `TECHNOLOGY` (used by domain)
- `TermSource`: add `USER_PROVIDED` and `LLM_ENRICHED` (used by domain), keep existing `AI_GENERATED`, `USER_SUBMITTED`, `SYSTEM_CURATED`

**Also fix:**
- `DomainEvent` interface: add optional `aggregateType` and `version` fields to match what `createDomainEvent` produces
- Add validation utility tests

### Layer 2: `packages/domain` — Fix Logic + Comprehensive Tests

**Bugs to fix:**
- `adjustConfidence`: capture `previousConfidence` BEFORE mutating `this._confidence`
- `createDomainEvent`: parameterize `aggregateType` instead of hardcoding

**Test rewrites (all files):**
- Replace `let`/`beforeEach` with factory functions
- Test behavior, not implementation
- Add missing scenarios: whitespace validation, `clearEvents`, edge cases, `glossaryId` handling
- Target: all use case paths covered, all aggregate mutations covered

### Layer 3: `packages/infra-adapters` — Fix + Unit Test

**Fixes:**
- Remove unused `QueryResult` import
- Fix event bus type assertion for `eventType`

**Tests with test doubles:**
- `InMemoryEventBus`: publish, subscribe, error isolation
- LLM providers: mock `fetch`, verify request format, error wrapping
- PostgreSQL repository: mock `Pool`, verify SQL and snapshot mapping
- Redis cache: mock `ioredis`, verify key format, TTL, serialization

### Layer 4: `apps/api` — Fix Wiring + Test

**Fixes:**
- `term-definition.mapper.ts`: `getSnapshot()` → `toSnapshot()`, correct property mapping
- `terminology.module.ts`: correct `GetTermDefinitionUseCase` constructor args (needs cache too)
- `terminology.service.ts`: correct property names, remove `['repository']` private access hack
- `domain-error.filter.ts`: align error codes with `ERROR_CODES` from shared
- `llm.config.ts`: align config shape with `LLMConfig` interface
- Register filters, interceptors, pipes in `main.ts` or `AppModule`

**Tests:**
- Controller: HTTP-level behavior tests
- Service: use case orchestration with mocked use cases
- Filters: error mapping behavior
- Mapper: snapshot-to-response transformation

### Layer 5: `apps/extension` — Fix + Test

**Fixes:**
- `dom-scanner.ts`: `walkDOM` must return accumulated text (not discard it)
- `term-highlighter.ts`: set `data-glossarly-context` attribute
- `jest.config.js`: add `test/` to roots
- Replace `any` types in message handler and API client
- Fix `window.glossarlyRescanTimeout` global

**Tests:**
- DOM scanner: text extraction from various DOM structures
- Term extraction: all 4 detection rules, deduplication, context extraction
- Term highlighter: DOM manipulation, highlight/remove cycles
- Fix existing test to use factory functions

### Layer 6: Cross-Cutting Cleanup

- Add `apps/extension/dist/` to `.gitignore`
- Set up `@glossarly/testing` package with shared test factories
- Final `tsc --noEmit` verification across all packages
- Mutation testing pass with Stryker

## Test Strategy

- **Framework:** Jest (already configured across packages)
- **Style:** Behavior-driven, factory functions, no `let`/`beforeEach`
- **Mocking:** Test doubles for interfaces (repository, cache, LLM provider)
- **Mutation testing:** Stryker to verify test effectiveness
- **No external dependencies:** All tests run without Docker/Postgres/Redis
