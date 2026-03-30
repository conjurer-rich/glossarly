# Codebase Fix & Test Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all compilation errors, logic bugs, and dead code across the Glossarly monorepo, then achieve comprehensive behavior-driven test coverage that survives mutation testing.

**Architecture:** Bottom-up fix order: shared types → domain logic → infra adapters → API app → extension. Each layer is fixed and tested before moving to the next, since upper layers depend on lower ones compiling correctly.

**Tech Stack:** TypeScript 5.7 strict mode, Jest 29, ts-jest, pnpm workspaces, Turborepo

---

### Task 1: Fix `TermCategory` and `TermSource` in shared types

**Files:**
- Modify: `packages/shared/src/api/contracts/types.ts`

**Context:** `TermCategory` and `TermSource` are plain string union types. The domain layer references them as `TermCategory.TECHNOLOGY`, `TermSource.LLM_ENRICHED` etc., which doesn't work because type aliases have no runtime values. Convert to `as const` objects with derived types, adding missing values the domain needs.

**Step 1: Write the failing test**

Create `packages/shared/src/__tests__/types.spec.ts`:

```typescript
import { TermCategory, TermSource } from '../api/contracts/types';

describe('TermCategory', () => {
  it('provides runtime values for all categories', () => {
    expect(TermCategory.ACRONYM).toBe('ACRONYM');
    expect(TermCategory.JARGON).toBe('JARGON');
    expect(TermCategory.TECHNOLOGY).toBe('TECHNOLOGY');
    expect(TermCategory.INDUSTRY_TERM).toBe('INDUSTRY_TERM');
    expect(TermCategory.PRODUCT_NAME).toBe('PRODUCT_NAME');
  });
});

describe('TermSource', () => {
  it('provides runtime values for all sources', () => {
    expect(TermSource.AI_GENERATED).toBe('AI_GENERATED');
    expect(TermSource.USER_SUBMITTED).toBe('USER_SUBMITTED');
    expect(TermSource.SYSTEM_CURATED).toBe('SYSTEM_CURATED');
    expect(TermSource.USER_PROVIDED).toBe('USER_PROVIDED');
    expect(TermSource.LLM_ENRICHED).toBe('LLM_ENRICHED');
  });
});
```

**Step 2: Ensure shared package has jest config**

Create `packages/shared/jest.config.js` if it doesn't exist:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
};
```

**Step 3: Run test to verify it fails**

Run: `cd packages/shared && npx jest --no-cache`
Expected: FAIL — `TermCategory.ACRONYM` is not a thing (it's a type alias, not an object)

**Step 4: Implement the fix**

Replace the type aliases in `packages/shared/src/api/contracts/types.ts`. Change `TermCategory` and `TermSource` from:

```typescript
export type TermCategory = 'ACRONYM' | 'JARGON' | 'INDUSTRY_TERM' | 'PRODUCT_NAME';
export type TermSource = 'AI_GENERATED' | 'USER_SUBMITTED' | 'SYSTEM_CURATED';
```

To:

```typescript
export const TermCategory = {
  ACRONYM: 'ACRONYM',
  JARGON: 'JARGON',
  TECHNOLOGY: 'TECHNOLOGY',
  INDUSTRY_TERM: 'INDUSTRY_TERM',
  PRODUCT_NAME: 'PRODUCT_NAME',
} as const;
export type TermCategory = (typeof TermCategory)[keyof typeof TermCategory];

export const TermSource = {
  AI_GENERATED: 'AI_GENERATED',
  USER_SUBMITTED: 'USER_SUBMITTED',
  SYSTEM_CURATED: 'SYSTEM_CURATED',
  USER_PROVIDED: 'USER_PROVIDED',
  LLM_ENRICHED: 'LLM_ENRICHED',
} as const;
export type TermSource = (typeof TermSource)[keyof typeof TermSource];
```

Leave all other type aliases (`DocumentType`, `GlossaryType`, etc.) as they are — they're not used as runtime values anywhere.

**Step 5: Run test to verify it passes**

Run: `cd packages/shared && npx jest --no-cache`
Expected: PASS

**Step 6: Commit**

```
feat(shared): convert TermCategory and TermSource to const objects with runtime values

Adds TECHNOLOGY category and USER_PROVIDED/LLM_ENRICHED sources needed by domain layer.
```

---

### Task 2: Fix `DomainEvent` interface in shared events

**Files:**
- Modify: `packages/shared/src/domain/events/index.ts`

**Context:** `createDomainEvent` in the domain package returns objects with `aggregateType` and `version` fields, but the `DomainEvent` interface doesn't include them. Add optional fields so the interface matches what's actually produced.

**Step 1: Write the failing test**

Add to `packages/shared/src/__tests__/types.spec.ts`:

```typescript
import { DomainEvent } from '../domain/events';

describe('DomainEvent', () => {
  it('allows aggregateType and version as optional fields', () => {
    const event: DomainEvent = {
      eventId: 'evt-1',
      eventType: 'TestEvent',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-1',
      payload: {},
      aggregateType: 'TestAggregate',
      version: 1,
    };

    expect(event.aggregateType).toBe('TestAggregate');
    expect(event.version).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/shared && npx jest --no-cache`
Expected: FAIL — TypeScript compilation error, `aggregateType` and `version` not in `DomainEvent`

**Step 3: Implement the fix**

Add optional fields to the `DomainEvent` interface in `packages/shared/src/domain/events/index.ts`:

```typescript
export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  aggregateType?: string;
  version?: number;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/shared && npx jest --no-cache`
Expected: PASS

**Step 5: Commit**

```
feat(shared): add optional aggregateType and version to DomainEvent interface
```

---

### Task 3: Add shared validation utility tests

**Files:**
- Create: `packages/shared/src/__tests__/validation.spec.ts`

**Context:** The 3 validation utilities (`isValidUUID`, `isValidEmail`, `isNonEmptyString`) have no tests. Add behavior-driven tests.

**Step 1: Write tests**

```typescript
import { isValidUUID, isValidEmail, isNonEmptyString } from '../utils/validation';

describe('isValidUUID', () => {
  const createValidUUID = () => 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  it('accepts a valid UUID v4', () => {
    expect(isValidUUID(createValidUUID())).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(isValidUUID(123)).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('rejects strings that are not UUID format', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it('rejects strings without @ sign', () => {
    expect(isValidEmail('no-at-sign')).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('accepts non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isNonEmptyString(0)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});
```

**Step 2: Run tests**

Run: `cd packages/shared && npx jest --no-cache`
Expected: PASS (these test existing behavior, no code changes needed)

**Step 3: Commit**

```
test(shared): add behavior-driven tests for validation utilities
```

---

### Task 4: Fix `adjustConfidence` event bug in domain aggregate

**Files:**
- Modify: `packages/domain/src/terminology/term-definition.aggregate.ts`
- Modify: `packages/domain/src/terminology/__tests__/term-definition.aggregate.spec.ts`

**Context:** `adjustConfidence` sets `this._confidence = clamped` BEFORE recording `previousConfidence: this._confidence` in the event. So `previousConfidence` always equals the new value. Fix: capture previous value first.

**Step 1: Write the failing test that exposes the bug**

Add to the test file (rewriting to use factory functions, replacing `beforeEach`/`let`):

```typescript
it('records the previous confidence in the event payload', () => {
  const aggregate = createAggregate({ confidence: 80 });
  aggregate.clearEvents();

  aggregate.adjustConfidence(90, 'Manual review');

  const events = aggregate.getUncommittedEvents();
  expect(events[0].payload).toEqual(
    expect.objectContaining({
      previousConfidence: 80,
      newConfidence: 90,
    }),
  );
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/domain && npx jest --no-cache -- term-definition.aggregate`
Expected: FAIL — `previousConfidence` is 90 (same as new), not 80

**Step 3: Fix the bug**

In `packages/domain/src/terminology/term-definition.aggregate.ts`, change `adjustConfidence`:

```typescript
adjustConfidence(newConfidence: number, reason: string): void {
  const previousConfidence = this._confidence;
  const clamped = Math.max(0, Math.min(100, newConfidence));
  this._confidence = clamped;
  this.markUpdated();

  this.addEvent(
    createDomainEvent('TermConfidenceAdjusted', this._id, {
      newConfidence: clamped,
      previousConfidence,
      reason,
    }),
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/domain && npx jest --no-cache -- term-definition.aggregate`
Expected: PASS

**Step 5: Commit**

```
fix(domain): capture previous confidence before mutation in adjustConfidence
```

---

### Task 5: Rewrite domain aggregate tests with factory functions

**Files:**
- Rewrite: `packages/domain/src/terminology/__tests__/term-definition.aggregate.spec.ts`

**Context:** Current tests use `TermCategory.TECHNOLOGY` and `TermSource.USER_PROVIDED` which now work after Task 1. But they use `let`/`beforeEach` pattern. Rewrite with factory functions per project guidelines. Also add missing test scenarios.

**Step 1: Rewrite the full test file**

Replace the entire file with factory-function-based tests. Key factory:

```typescript
import { TermDefinitionAggregate } from '../term-definition.aggregate';
import { ValidationError } from '../../shared/errors';
import { TermCategory, TermSource } from '@glossarly/shared';

function createAggregate(overrides: Partial<{
  id: string;
  term: string;
  definition: string;
  example: string;
  category: TermCategory;
  confidence: number;
  source: TermSource;
}> = {}) {
  return TermDefinitionAggregate.create({
    id: overrides.id ?? 'test-id',
    term: overrides.term ?? 'test-term',
    definition: overrides.definition ?? 'test-definition',
    example: overrides.example,
    category: overrides.category ?? TermCategory.TECHNOLOGY,
    confidence: overrides.confidence ?? 80,
    source: overrides.source ?? TermSource.USER_PROVIDED,
  });
}
```

Tests to include:
- **create**: rejects empty term, rejects whitespace-only term, rejects empty definition, rejects confidence < 0, rejects confidence > 100, emits TermDefinitionCreated event with correct payload, sets all properties
- **updateDefinition**: updates definition/example/source, emits TermDefinitionUpdated event, rejects empty definition, updates updatedAt timestamp
- **adjustConfidence**: updates confidence, clamps above 100, clamps below 0, records previous confidence in event, updates updatedAt
- **toSnapshot/fromSnapshot**: round-trip fidelity, fromSnapshot emits no events
- **clearEvents**: clears accumulated events

**Step 2: Run tests**

Run: `cd packages/domain && npx jest --no-cache -- term-definition.aggregate`
Expected: ALL PASS

**Step 3: Commit**

```
refactor(domain): rewrite aggregate tests with factory functions and comprehensive coverage
```

---

### Task 6: Fix `createDomainEvent` hardcoded aggregateType

**Files:**
- Modify: `packages/domain/src/shared/domain-event.ts`

**Context:** `createDomainEvent` hardcodes `aggregateType: 'TermDefinition'`. Add it as a parameter with a default for backward compatibility.

**Step 1: Write the failing test**

Create `packages/domain/src/shared/__tests__/domain-event.spec.ts`:

```typescript
import { createDomainEvent } from '../domain-event';

describe('createDomainEvent', () => {
  it('creates an event with the given type and payload', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', { key: 'value' });

    expect(event.eventType).toBe('TestEvent');
    expect(event.aggregateId).toBe('agg-1');
    expect(event.payload).toEqual({ key: 'value' });
  });

  it('generates a unique eventId', () => {
    const event1 = createDomainEvent('TestEvent', 'agg-1', {});
    const event2 = createDomainEvent('TestEvent', 'agg-1', {});

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('sets occurredAt to an ISO timestamp', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', {});

    expect(() => new Date(event.occurredAt)).not.toThrow();
    expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);
  });

  it('defaults aggregateType to TermDefinition', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', {});

    expect(event.aggregateType).toBe('TermDefinition');
  });

  it('allows overriding aggregateType', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', {}, 'CustomAggregate');

    expect(event.aggregateType).toBe('CustomAggregate');
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL on "allows overriding aggregateType" (4th param not accepted)

**Step 3: Implement the fix**

```typescript
export function createDomainEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  aggregateType: string = 'TermDefinition',
): DomainEvent {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: new Date().toISOString(),
    version: 1,
  };
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```
refactor(domain): parameterize aggregateType in createDomainEvent
```

---

### Task 7: Rewrite use case tests with factory functions

**Files:**
- Rewrite: `packages/domain/src/terminology/__tests__/get-term-definition.use-case.spec.ts`
- Rewrite: `packages/domain/src/terminology/__tests__/enrich-term-definition.use-case.spec.ts`

**Context:** Both test files use `let`/`beforeEach`. Rewrite with factory functions. Also add missing test scenarios: termId lookup failure, language forwarding, repository save error in enrich.

**Step 1: Rewrite both test files**

Key factories for both:

```typescript
function createMockRepository(): jest.Mocked<ITermDefinitionRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    findByTerm: jest.fn(),
    searchTerms: jest.fn(),
    findByCategory: jest.fn(),
    bulkSave: jest.fn(),
  };
}

function createMockCache(): jest.Mocked<ITermCache> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    clear: jest.fn(),
  };
}

function createAggregate(overrides: Partial<{ id: string; term: string }> = {}) {
  return TermDefinitionAggregate.create({
    id: overrides.id ?? 'test-id',
    term: overrides.term ?? 'test-term',
    definition: 'test-definition',
    category: TermCategory.TECHNOLOGY,
    confidence: 95,
    source: TermSource.USER_PROVIDED,
  });
}
```

**Additional tests for GetTermDefinitionUseCase:**
- termId lookup failure throws EntityNotFoundError

**Additional tests for EnrichTermDefinitionUseCase:**
- language is forwarded to LLM provider
- remove flaky setTimeout-based latency test (replace with asserting `latencyMs` is a number >= 0)

**Step 2: Run tests**

Run: `cd packages/domain && npx jest --no-cache`
Expected: ALL PASS

**Step 3: Commit**

```
refactor(domain): rewrite use case tests with factory functions and added coverage
```

---

### Task 8: Fix `TermDefinitionMapper` in API

**Files:**
- Modify: `apps/api/src/modules/terminology/term-definition.mapper.ts`

**Context:** Mapper calls `aggregate.getSnapshot()` (should be `toSnapshot()`), and references `snapshot.examples`, `snapshot.relatedTerms`, `snapshot.enrichmentMetadata` which don't exist on `TermDefinitionSnapshot`. Also the `TermDefinition_Response` contract expects `example?: string` not `examples: string[]`, and `createdAt`/`updatedAt` as ISO strings not Date objects.

**Step 1: Write the failing test**

Create `apps/api/src/modules/terminology/__tests__/term-definition.mapper.spec.ts`:

```typescript
import { TermDefinitionMapper } from '../term-definition.mapper';
import { TermDefinitionAggregate } from '@glossarly/domain';
import { TermCategory, TermSource } from '@glossarly/shared';

function createAggregate() {
  return TermDefinitionAggregate.create({
    id: 'test-id',
    term: 'test-term',
    definition: 'test-definition',
    example: 'test-example',
    category: TermCategory.TECHNOLOGY,
    confidence: 85,
    source: TermSource.USER_PROVIDED,
  });
}

describe('TermDefinitionMapper', () => {
  describe('toResponse', () => {
    it('maps aggregate to response DTO with correct field names', () => {
      const aggregate = createAggregate();
      const response = TermDefinitionMapper.toResponse(aggregate);

      expect(response).toEqual({
        id: 'test-id',
        term: 'test-term',
        definition: 'test-definition',
        example: 'test-example',
        category: TermCategory.TECHNOLOGY,
        confidence: 85,
        source: TermSource.USER_PROVIDED,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('returns ISO string timestamps', () => {
      const aggregate = createAggregate();
      const response = TermDefinitionMapper.toResponse(aggregate);

      expect(() => new Date(response.createdAt)).not.toThrow();
      expect(() => new Date(response.updatedAt)).not.toThrow();
    });
  });

  describe('toResponseList', () => {
    it('maps array of aggregates to response DTOs', () => {
      const aggregates = [createAggregate(), createAggregate()];
      const responses = TermDefinitionMapper.toResponseList(aggregates);

      expect(responses).toHaveLength(2);
      expect(responses[0].term).toBe('test-term');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `aggregate.getSnapshot is not a function` (method is `toSnapshot`)

**Step 3: Implement the fix**

Replace `apps/api/src/modules/terminology/term-definition.mapper.ts`:

```typescript
import { TermDefinitionAggregate } from '@glossarly/domain';
import { TermDefinition_Response } from '@glossarly/shared';

export class TermDefinitionMapper {
  static toResponse(aggregate: TermDefinitionAggregate): TermDefinition_Response {
    const snapshot = aggregate.toSnapshot();

    return {
      id: snapshot.id,
      term: snapshot.term,
      definition: snapshot.definition,
      example: snapshot.example,
      category: snapshot.category,
      confidence: snapshot.confidence,
      source: snapshot.source,
      createdAt: snapshot.createdAt.toISOString(),
      updatedAt: snapshot.updatedAt.toISOString(),
    };
  }

  static toResponseList(
    aggregates: TermDefinitionAggregate[],
  ): TermDefinition_Response[] {
    return aggregates.map((aggregate) => this.toResponse(aggregate));
  }
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```
fix(api): fix TermDefinitionMapper to use toSnapshot() and correct property names
```

---

### Task 9: Fix `TerminologyService` property mismatches

**Files:**
- Modify: `apps/api/src/modules/terminology/terminology.service.ts`

**Context:** `defineAndEnrichTerm` passes `initialDefinition`, `category`, `source` which aren't in `EnrichTermDefinitionRequest` (it extends `EnrichTermRequest` which has `term`, `context`, `language`). `searchTerms` hacks into private `['repository']` with a `.search()` method that doesn't exist. `bulkEnrich` passes `term.term`, `term.initialDefinition` etc. but `BulkEnrichTerms_Request.terms` has `text` and `context` fields. Also response shapes don't match `SearchTerms_Response` and `BulkEnrichTerms_Response`.

**Step 1: Write the failing test**

Create `apps/api/src/modules/terminology/__tests__/terminology.service.spec.ts`:

```typescript
import { TerminologyService } from '../terminology.service';
import {
  GetTermDefinitionUseCase,
  EnrichTermDefinitionUseCase,
  ITermDefinitionRepository,
  ITermCache,
  TermDefinitionAggregate,
} from '@glossarly/domain';
import { TermCategory, TermSource } from '@glossarly/shared';

function createAggregate() {
  return TermDefinitionAggregate.create({
    id: 'test-id',
    term: 'test-term',
    definition: 'test-definition',
    example: 'test-example',
    category: TermCategory.TECHNOLOGY,
    confidence: 85,
    source: TermSource.USER_PROVIDED,
  });
}

function createMockRepository(): jest.Mocked<ITermDefinitionRepository> {
  return {
    save: jest.fn(), findById: jest.fn(), delete: jest.fn(),
    findByTerm: jest.fn(), searchTerms: jest.fn(),
    findByCategory: jest.fn(), bulkSave: jest.fn(),
  };
}

function createMockCache(): jest.Mocked<ITermCache> {
  return { get: jest.fn(), set: jest.fn(), invalidate: jest.fn(), clear: jest.fn() };
}

function createService() {
  const repository = createMockRepository();
  const cache = createMockCache();
  const getTermUseCase = new GetTermDefinitionUseCase(repository, cache);
  const enrichUseCase = new EnrichTermDefinitionUseCase(repository, cache, {
    enrichTerm: jest.fn().mockResolvedValue({
      definition: 'enriched', example: 'ex', confidence: 90,
      category: TermCategory.TECHNOLOGY, tokensUsed: 100,
    }),
  });

  const service = new TerminologyService(getTermUseCase, enrichUseCase);
  return { service, repository, cache, enrichUseCase };
}

describe('TerminologyService', () => {
  describe('defineAndEnrichTerm', () => {
    it('passes term and context to enrich use case', async () => {
      const { service, cache, repository } = createService();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      repository.save.mockResolvedValue(undefined);
      cache.set.mockResolvedValue(undefined);

      const result = await service.defineAndEnrichTerm({
        term: 'pipeline',
        context: 'sales pipeline',
      });

      expect(result.definition.term).toBe('pipeline');
      expect(result.cached).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTermDefinition', () => {
    it('retrieves term by ID and returns response DTO', async () => {
      const { service, repository, cache } = createService();
      const aggregate = createAggregate();
      repository.findById.mockResolvedValue(aggregate);
      cache.set.mockResolvedValue(undefined);

      const result = await service.getTermDefinition('test-id');

      expect(result.id).toBe('test-id');
      expect(result.term).toBe('test-term');
    });
  });

  describe('searchTerms', () => {
    it('delegates search to repository and returns response', async () => {
      const { service, repository } = createService();
      const aggregate = createAggregate();
      repository.searchTerms.mockResolvedValue([aggregate]);

      const result = await service.searchTerms({ query: 'test', limit: 10 });

      expect(result.results).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.query).toBe('test');
    });
  });

  describe('bulkEnrich', () => {
    it('enriches each term and returns aggregated response', async () => {
      const { service, cache, repository } = createService();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      repository.save.mockResolvedValue(undefined);
      cache.set.mockResolvedValue(undefined);

      const result = await service.bulkEnrich({
        terms: [{ text: 'pipeline', context: 'sales pipeline' }],
      });

      expect(result.definitions).toHaveLength(1);
      expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `defineAndEnrichTerm` passes wrong properties to use case

**Step 3: Implement the fix**

Rewrite `apps/api/src/modules/terminology/terminology.service.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  GetTermDefinitionUseCase,
  EnrichTermDefinitionUseCase,
  ITermDefinitionRepository,
} from '@glossarly/domain';
import {
  DefineTerm_Request,
  TermDefinition_Response,
  SearchTerms_Request,
  SearchTerms_Response,
  BulkEnrichTerms_Request,
  BulkEnrichTerms_Response,
} from '@glossarly/shared';
import { TermDefinitionMapper } from './term-definition.mapper';

interface EnrichmentResult {
  definition: TermDefinition_Response;
  cached: boolean;
  latencyMs: number;
}

@Injectable()
export class TerminologyService {
  private readonly logger = new Logger(TerminologyService.name);

  constructor(
    @Inject('GET_TERM_USE_CASE')
    private getTermUseCase: GetTermDefinitionUseCase,
    @Inject('ENRICH_TERM_USE_CASE')
    private enrichUseCase: EnrichTermDefinitionUseCase,
    @Inject('ITermDefinitionRepository')
    private repository: ITermDefinitionRepository,
  ) {}

  async defineAndEnrichTerm(
    request: DefineTerm_Request,
  ): Promise<EnrichmentResult> {
    const result = await this.enrichUseCase.execute({
      term: request.term,
      context: request.context ?? '',
    });

    return {
      definition: TermDefinitionMapper.toResponse(result.aggregate),
      cached: result.cached,
      latencyMs: result.latencyMs,
    };
  }

  async getTermDefinition(termId: string): Promise<TermDefinition_Response> {
    const result = await this.getTermUseCase.execute({ termId });
    return TermDefinitionMapper.toResponse(result.aggregate);
  }

  async searchTerms(request: SearchTerms_Request): Promise<SearchTerms_Response> {
    const aggregates = await this.repository.searchTerms(
      request.query,
      request.limit ?? 10,
    );

    return {
      results: TermDefinitionMapper.toResponseList(aggregates),
      totalCount: aggregates.length,
      query: request.query,
    };
  }

  async bulkEnrich(
    request: BulkEnrichTerms_Request,
  ): Promise<BulkEnrichTerms_Response> {
    const startTime = Date.now();
    const definitions: TermDefinition_Response[] = [];
    const failedTerms: Array<{ text: string; reason: string }> = [];
    let cacheHits = 0;

    for (const term of request.terms) {
      try {
        const result = await this.enrichUseCase.execute({
          term: term.text,
          context: term.context,
        });

        if (result.cached) {
          cacheHits++;
        }

        definitions.push(TermDefinitionMapper.toResponse(result.aggregate));
      } catch (error) {
        failedTerms.push({
          text: term.text,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      definitions,
      failedTerms,
      cacheHitRate: request.terms.length > 0 ? cacheHits / request.terms.length : 0,
      totalLatencyMs: Date.now() - startTime,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Also update `terminology.module.ts`**

Fix the `GetTermDefinitionUseCase` factory to pass both `repository` and `cache`:

```typescript
{
  provide: 'GET_TERM_USE_CASE',
  useFactory: (
    repository: ITermDefinitionRepository,
    cache: ITermCache,
  ) => {
    return new GetTermDefinitionUseCase(repository, cache);
  },
  inject: ['ITermDefinitionRepository', 'ITermCache'],
},
```

Also inject `ITermDefinitionRepository` into the service via the module providers (it's already provided, just needs the `@Inject` in the service constructor to pick it up — already done in Step 3 above).

**Step 6: Commit**

```
fix(api): fix TerminologyService property mismatches and search hack
```

---

### Task 10: Fix `DomainErrorFilter` response shape

**Files:**
- Modify: `apps/api/src/shared/filters/domain-error.filter.ts`

**Context:** Filter references `ERROR_CODES.NOT_FOUND` (doesn't exist, should be `TERM_NOT_FOUND`) and wraps the response in `{ error: { ... } }` instead of the flat `ApiError_Response` shape which has `code`, `message`, `details`, `timestamp`, `requestId` at top level.

**Step 1: Write the failing test**

Create `apps/api/src/shared/filters/__tests__/domain-error.filter.spec.ts`:

```typescript
import { DomainErrorFilter } from '../domain-error.filter';
import { EntityNotFoundError, ValidationError, ExternalServiceError, DomainError } from '@glossarly/domain';
import { ERROR_CODES } from '@glossarly/shared';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';

function createMockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const getRequest = jest.fn().mockReturnValue({ id: 'req-123' });
  const getResponse = jest.fn().mockReturnValue({ status });
  const switchToHttp = jest.fn().mockReturnValue({ getResponse, getRequest });

  return { host: { switchToHttp } as unknown as ArgumentsHost, json, status };
}

describe('DomainErrorFilter', () => {
  const filter = new DomainErrorFilter();

  it('maps EntityNotFoundError to 404 with TERM_NOT_FOUND code', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new EntityNotFoundError('Term not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ERROR_CODES.TERM_NOT_FOUND,
        message: 'Term not found',
        timestamp: expect.any(String),
        requestId: 'req-123',
      }),
    );
  });

  it('maps ValidationError to 400', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new ValidationError('Invalid input'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
  });

  it('maps ExternalServiceError to 502', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new ExternalServiceError('LLM failed'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.LLM_PROVIDER_ERROR }),
    );
  });

  it('maps generic DomainError to 500', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new DomainError('Unknown', 'UNKNOWN'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.INTERNAL_ERROR }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `ERROR_CODES.NOT_FOUND` is not a property, response shape is wrong

**Step 3: Implement the fix**

```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  DomainError, EntityNotFoundError, ValidationError, ExternalServiceError,
} from '@glossarly/domain';
import { ApiError_Response, ERROR_CODES } from '@glossarly/shared';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ERROR_CODES.INTERNAL_ERROR;

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      errorCode = ERROR_CODES.TERM_NOT_FOUND;
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
    } else if (exception instanceof ExternalServiceError) {
      status = HttpStatus.BAD_GATEWAY;
      errorCode = ERROR_CODES.LLM_PROVIDER_ERROR;
    }

    const errorResponse: ApiError_Response = {
      code: errorCode,
      message: exception.message,
      timestamp: new Date().toISOString(),
      requestId: request.id ?? 'unknown',
    };

    response.status(status).json(errorResponse);
  }
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```
fix(api): fix DomainErrorFilter error codes and response shape
```

---

### Task 11: Fix `AllExceptionsFilter` response shape

**Files:**
- Modify: `apps/api/src/shared/filters/all-exceptions.filter.ts`

**Context:** Same `{ error: { ... } }` nesting issue as `DomainErrorFilter`.

**Step 1: Write the failing test**

Create `apps/api/src/shared/filters/__tests__/all-exceptions.filter.spec.ts` with same mock pattern. Verify response is flat `ApiError_Response`.

**Step 2: Fix to match flat `ApiError_Response` shape**

```typescript
const errorResponse: ApiError_Response = {
  code: ERROR_CODES.INTERNAL_ERROR,
  message: exception instanceof Error ? exception.message : 'An unexpected error occurred',
  timestamp: new Date().toISOString(),
  requestId: request.id ?? 'unknown',
};
```

**Step 3: Run test, commit**

```
fix(api): fix AllExceptionsFilter response shape to match ApiError_Response
```

---

### Task 12: Fix `llm.config.ts` config shape mismatch

**Files:**
- Modify: `apps/api/src/config/llm.config.ts`

**Context:** `createLLMProvider` expects `{ provider, apiKey, model? }` but `llm.config.ts` passes `{ provider, openaiApiKey, anthropicApiKey }`. Fix to pass the correct API key based on provider selection.

**Step 1: Write the test**

Create `apps/api/src/config/__tests__/llm.config.spec.ts`:

Test that the factory provider calls `createLLMProvider` with the right shape.

**Step 2: Fix the config**

```typescript
export const llmProvider = {
  provide: 'LLM_PROVIDER',
  useFactory: (configService: ConfigService): ILLMProvider => {
    const provider = configService.get<string>('LLM_PROVIDER', 'openai') as 'openai' | 'anthropic';
    const apiKey = provider === 'anthropic'
      ? configService.get<string>('ANTHROPIC_API_KEY', '')
      : configService.get<string>('OPENAI_API_KEY', '');

    return createLLMProvider({ provider, apiKey });
  },
  inject: [ConfigService],
};
```

Also remove the unused `LLMConfig` class from this file.

**Step 3: Commit**

```
fix(api): fix LLM config to pass correct apiKey shape to createLLMProvider
```

---

### Task 13: Register filters and interceptors in main.ts

**Files:**
- Modify: `apps/api/src/main.ts`

**Context:** `DomainErrorFilter`, `AllExceptionsFilter`, `RequestIdInterceptor`, `LoggingInterceptor` exist but are never registered. Wire them up.

**Step 1: Implement the fix**

Add to `main.ts` after `app.useGlobalPipes(...)`:

```typescript
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { DomainErrorFilter } from './shared/filters/domain-error.filter';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

// Order matters: AllExceptionsFilter catches what DomainErrorFilter doesn't
app.useGlobalFilters(new AllExceptionsFilter(), new DomainErrorFilter());
app.useGlobalInterceptors(new RequestIdInterceptor(), new LoggingInterceptor());
```

Remove the custom `ValidationPipe` class in `shared/pipes/validation.pipe.ts` since it duplicates what `main.ts` does inline.

**Step 2: Commit**

```
feat(api): register global filters and interceptors in main.ts
```

---

### Task 14: Fix extension `DOMScanner.extractVisibleText`

**Files:**
- Modify: `apps/extension/src/content/dom-scanner.ts`

**Context:** `extractVisibleText()` calls `this.walkDOM(...)` but ignores the return value. `walkDOM` returns the accumulated string, but the caller never captures it. The `concatenatedText` local variable stays `""`.

**Step 1: Write the failing test**

Create `apps/extension/src/content/__tests__/dom-scanner.spec.ts`:

```typescript
/**
 * @jest-environment jsdom
 */
import { DOMScanner } from '../dom-scanner';

function createDOMWithText(html: string) {
  document.body.innerHTML = html;
  return new DOMScanner();
}

describe('DOMScanner', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts visible text from the page', () => {
    const scanner = createDOMWithText('<p>Hello World</p>');
    const { text, nodes } = scanner.extractVisibleText();

    expect(text).toContain('Hello World');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('skips script and style tags', () => {
    const scanner = createDOMWithText(
      '<p>Visible</p><script>hidden</script><style>.hidden{}</style>'
    );
    const { text } = scanner.extractVisibleText();

    expect(text).toContain('Visible');
    expect(text).not.toContain('hidden');
  });

  it('tracks correct offsets for text nodes', () => {
    const scanner = createDOMWithText('<p>First</p><p>Second</p>');
    const { nodes } = scanner.extractVisibleText();

    const firstNode = nodes.find(n => n.text === 'First');
    const secondNode = nodes.find(n => n.text === 'Second');

    expect(firstNode?.offset).toBe(0);
    expect(secondNode?.offset).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `text` is `""` because return value is discarded

**Step 3: Fix the bug**

Change `extractVisibleText()` to capture the return:

```typescript
extractVisibleText(): { text: string; nodes: TextNodeRef[] } {
  const nodes: TextNodeRef[] = [];
  const text = this.walkDOM(document.documentElement, nodes, '');

  return { text, nodes };
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```
fix(extension): capture walkDOM return value in extractVisibleText
```

---

### Task 15: Fix extension jest config and rewrite existing test

**Files:**
- Modify: `apps/extension/jest.config.js` (if exists) or create it

**Context:** Jest `roots` is `['<rootDir>/src']` but tests are in `test/`. Either move tests or fix config.

**Step 1: Fix jest config**

Move tests into `src/` to colocate them (convention used by the domain package):
- Move `apps/extension/test/term-extraction.spec.ts` to `apps/extension/src/content/__tests__/term-extraction.spec.ts`

Or update jest config roots to include both. Prefer moving to `src/` for consistency.

**Step 2: Rewrite test with factory functions**

Replace `let`/`beforeEach` with:

```typescript
import { TermExtractor } from '../term-extraction';

function createExtractor() {
  return new TermExtractor();
}
```

**Step 3: Run tests, commit**

```
refactor(extension): move tests to src/ and rewrite with factory functions
```

---

### Task 16: Add comprehensive extension term extraction tests

**Files:**
- Modify: `apps/extension/src/content/__tests__/term-extraction.spec.ts`

**Context:** Current tests cover basic cases. Add tests for all 4 detection rules, multi-word seed terms, and edge cases.

**Step 1: Add tests**

Additional test cases:
- CamelCase detection (e.g. `SaaS`, `DevOps`)
- Pattern detection (`gamification`, `monetization`)
- Multi-word seed terms (`paradigm shift`, `low-hanging fruit`)
- Empty text returns empty array
- Context extraction returns surrounding text

**Step 2: Run tests, commit**

```
test(extension): add comprehensive term extraction tests
```

---

### Task 17: Add extension term highlighter tests

**Files:**
- Create: `apps/extension/src/content/__tests__/term-highlighter.spec.ts`

**Context:** `TermHighlighter` has no tests. Test DOM manipulation behavior.

**Step 1: Write tests**

```typescript
/**
 * @jest-environment jsdom
 */
import { TermHighlighter } from '../term-highlighter';

function createHighlighter() {
  return new TermHighlighter();
}

describe('TermHighlighter', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('wraps matched text in highlight spans', () => {
    document.body.innerHTML = '<p>The ROI is important</p>';
    const textNode = document.querySelector('p')!.firstChild as Text;
    const highlighter = createHighlighter();

    highlighter.highlightTerms(
      [{ text: 'ROI', position: { start: 4, end: 7 }, confidence: 90, context: '', category: 'acronym' }],
      [{ node: textNode, text: 'The ROI is important', offset: 0 }],
    );

    const spans = document.querySelectorAll('.glossarly-highlight');
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe('ROI');
  });

  it('removes all highlights', () => {
    document.body.innerHTML = '<p>The <span class="glossarly-highlight">ROI</span> is important</p>';
    const highlighter = createHighlighter();

    highlighter.removeAllHighlights();

    expect(document.querySelectorAll('.glossarly-highlight')).toHaveLength(0);
    expect(document.querySelector('p')!.textContent).toBe('The ROI is important');
  });
});
```

**Step 2: Run tests, commit**

```
test(extension): add term highlighter behavior tests
```

---

### Task 18: Add infra-adapters event bus tests

**Files:**
- Create: `packages/infra-adapters/src/event-bus/__tests__/in-memory-event-bus.spec.ts`

**Step 1: Write tests**

```typescript
import { InMemoryEventBus } from '../in-memory-event-bus';
import { DomainEvent } from '@glossarly/shared';

function createEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: 'evt-1',
    eventType: overrides.eventType ?? 'TestEvent',
    occurredAt: new Date().toISOString(),
    aggregateId: 'agg-1',
    payload: {},
    ...overrides,
  };
}

describe('InMemoryEventBus', () => {
  it('delivers published events to subscribed handlers', async () => {
    const bus = new InMemoryEventBus();
    const received: DomainEvent[] = [];
    bus.subscribe('TestEvent', async (event) => { received.push(event); });

    await bus.publish(createEvent());

    expect(received).toHaveLength(1);
  });

  it('does not deliver events to unrelated handlers', async () => {
    const bus = new InMemoryEventBus();
    const received: DomainEvent[] = [];
    bus.subscribe('OtherEvent', async (event) => { received.push(event); });

    await bus.publish(createEvent({ eventType: 'TestEvent' }));

    expect(received).toHaveLength(0);
  });

  it('isolates handler errors from each other', async () => {
    const bus = new InMemoryEventBus();
    const received: DomainEvent[] = [];
    bus.subscribe('TestEvent', async () => { throw new Error('boom'); });
    bus.subscribe('TestEvent', async (event) => { received.push(event); });

    await bus.publish(createEvent());

    expect(received).toHaveLength(1);
  });

  it('publishes all events in order', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe('A', async () => { received.push('A'); });
    bus.subscribe('B', async () => { received.push('B'); });

    await bus.publishAll([
      createEvent({ eventType: 'A' }),
      createEvent({ eventType: 'B' }),
    ]);

    expect(received).toEqual(['A', 'B']);
  });
});
```

**Step 2: Run tests, commit**

```
test(infra): add InMemoryEventBus behavior tests
```

---

### Task 19: Add infra-adapters LLM provider tests

**Files:**
- Create: `packages/infra-adapters/src/external-services/llm/__tests__/openai-provider.spec.ts`
- Create: `packages/infra-adapters/src/external-services/llm/__tests__/anthropic-provider.spec.ts`

**Context:** Test using a mock `fetch` global. Verify request shape, response parsing, error wrapping.

**Step 1: Write tests for OpenAI provider**

```typescript
import { OpenAIProvider } from '../openai-provider';

function createProvider(apiKey = 'test-key') {
  return new OpenAIProvider(apiKey);
}

function mockFetchResponse(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => body,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Error',
  });
}

describe('OpenAIProvider', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('sends correct request shape to OpenAI API', async () => {
    mockFetchResponse({
      choices: [{ message: { content: JSON.stringify({
        definition: 'def', example: 'ex', confidence: 85, category: 'JARGON',
      }) } }],
      usage: { total_tokens: 100 },
    });

    const provider = createProvider();
    await provider.enrichTerm({ term: 'pipeline', context: 'sales context' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('wraps API errors as ExternalServiceError', async () => {
    mockFetchResponse({ error: { message: 'Rate limited' } }, false);

    const provider = createProvider();

    await expect(
      provider.enrichTerm({ term: 'test', context: '' }),
    ).rejects.toThrow('ExternalServiceError');
  });

  it('throws if apiKey is not provided', () => {
    expect(() => new OpenAIProvider('')).toThrow();
  });
});
```

Write equivalent test for Anthropic provider (different API shape).

**Step 2: Run tests, commit**

```
test(infra): add LLM provider unit tests with mocked fetch
```

---

### Task 20: Verify compilation across all packages

**Files:** None — verification only

**Step 1: Run TypeScript compilation**

Run: `cd /c/Users/Rich/_dev/glossarly && npx turbo run build`

If any compilation errors remain, fix them.

**Step 2: Run all tests**

Run: `cd /c/Users/Rich/_dev/glossarly && npx turbo run test`

All tests should pass.

**Step 3: Commit any remaining fixes**

```
chore: fix remaining compilation errors across packages
```

---

### Task 21: Add `dist/` to extension .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add `apps/extension/dist/` to `.gitignore`**

It's already got `dist/` at the root level which should match, but the extension dist was tracked. Add explicit ignore if needed, and remove from tracking.

**Step 2: Commit**

```
chore: ensure extension dist/ is gitignored
```

---

### Task 22: Mutation testing setup and verification

**Files:**
- Create: `stryker.config.js` or `stryker.config.mjs` at relevant package levels

**Step 1: Install Stryker**

```bash
pnpm add -Dw @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker
```

**Step 2: Configure for domain package first**

Create `packages/domain/stryker.config.mjs`:

```javascript
export default {
  mutate: ['src/**/*.ts', '!src/**/__tests__/**'],
  testRunner: 'jest',
  jest: { configFile: 'jest.config.js' },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  reporters: ['clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 },
};
```

**Step 3: Run mutation tests**

Run: `cd packages/domain && npx stryker run`

Review surviving mutants. Add tests to kill them.

**Step 4: Repeat for extension term-extraction**

**Step 5: Commit**

```
test: add mutation testing with Stryker and kill surviving mutants
```

---

## Summary of All Tasks

| # | Layer | Description |
|---|-------|-------------|
| 1 | shared | Convert TermCategory/TermSource to const objects |
| 2 | shared | Add aggregateType/version to DomainEvent interface |
| 3 | shared | Add validation utility tests |
| 4 | domain | Fix adjustConfidence event bug |
| 5 | domain | Rewrite aggregate tests with factory functions |
| 6 | domain | Fix createDomainEvent hardcoded aggregateType |
| 7 | domain | Rewrite use case tests with factory functions |
| 8 | api | Fix TermDefinitionMapper |
| 9 | api | Fix TerminologyService property mismatches |
| 10 | api | Fix DomainErrorFilter response shape |
| 11 | api | Fix AllExceptionsFilter response shape |
| 12 | api | Fix llm.config.ts config shape |
| 13 | api | Register filters and interceptors |
| 14 | extension | Fix DOMScanner.extractVisibleText |
| 15 | extension | Fix jest config and move tests |
| 16 | extension | Add comprehensive term extraction tests |
| 17 | extension | Add term highlighter tests |
| 18 | infra | Add event bus tests |
| 19 | infra | Add LLM provider tests |
| 20 | all | Verify compilation across all packages |
| 21 | all | Gitignore extension dist |
| 22 | all | Mutation testing setup and verification |
