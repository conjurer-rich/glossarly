import { TerminologyService } from '../terminology.service';
import {
  GetTermDefinitionUseCase,
  EnrichTermDefinitionUseCase,
  TermDefinitionAggregate,
  ITermDefinitionRepository,
} from '@glossarly/domain';
import { TermCategory, TermSource } from '@glossarly/shared';

function createTestAggregate(
  overrides: Partial<{
    id: string;
    term: string;
    definition: string;
    example: string;
    category: TermCategory;
    confidence: number;
    source: TermSource;
  }> = {},
) {
  return TermDefinitionAggregate.create({
    id: overrides.id ?? 'test-id',
    term: overrides.term ?? 'test-term',
    definition: overrides.definition ?? 'test-definition',
    example: overrides.example,
    category: overrides.category ?? TermCategory.TECHNOLOGY,
    confidence: overrides.confidence ?? 85,
    source: overrides.source ?? TermSource.USER_PROVIDED,
  });
}

function createMockGetTermUseCase() {
  return {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetTermDefinitionUseCase>;
}

function createMockEnrichUseCase() {
  return {
    execute: jest.fn(),
  } as unknown as jest.Mocked<EnrichTermDefinitionUseCase>;
}

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

function createService() {
  const getTermUseCase = createMockGetTermUseCase();
  const enrichUseCase = createMockEnrichUseCase();
  const repository = createMockRepository();
  const service = new TerminologyService(
    getTermUseCase,
    enrichUseCase,
    repository,
  );
  return { service, getTermUseCase, enrichUseCase, repository };
}

describe('TerminologyService', () => {
  describe('defineAndEnrichTerm', () => {
    it('passes term and context to the enrich use case', async () => {
      const { service, enrichUseCase } = createService();
      const aggregate = createTestAggregate({ term: 'pipeline' });
      enrichUseCase.execute.mockResolvedValue({
        aggregate,
        cached: false,
        latencyMs: 100,
      });

      const result = await service.defineAndEnrichTerm({
        term: 'pipeline',
        context: 'sales context',
      });

      expect(enrichUseCase.execute).toHaveBeenCalledWith({
        term: 'pipeline',
        context: 'sales context',
      });
      expect(result.definition.term).toBe('pipeline');
      expect(result.cached).toBe(false);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('propagates errors from the enrich use case', async () => {
      const { service, enrichUseCase } = createService();
      enrichUseCase.execute.mockRejectedValue(new Error('LLM failed'));

      await expect(
        service.defineAndEnrichTerm({ term: 'test', context: 'ctx' }),
      ).rejects.toThrow('LLM failed');
    });
  });

  describe('getTermDefinition', () => {
    it('retrieves a term by ID and returns mapped response', async () => {
      const { service, getTermUseCase } = createService();
      const aggregate = createTestAggregate({ id: 'lookup-id', term: 'api' });
      getTermUseCase.execute.mockResolvedValue({
        aggregate,
        cached: false,
      });

      const result = await service.getTermDefinition('lookup-id');

      expect(getTermUseCase.execute).toHaveBeenCalledWith({
        termId: 'lookup-id',
      });
      expect(result.id).toBe('lookup-id');
      expect(result.term).toBe('api');
    });
  });

  describe('searchTerms', () => {
    it('delegates to repository searchTerms and returns mapped results', async () => {
      const { service, repository } = createService();
      const aggregates = [
        createTestAggregate({ id: 'a', term: 'alpha' }),
        createTestAggregate({ id: 'b', term: 'beta' }),
      ];
      repository.searchTerms.mockResolvedValue(aggregates);

      const result = await service.searchTerms({
        query: 'al',
        limit: 10,
      });

      expect(repository.searchTerms).toHaveBeenCalledWith('al', 10);
      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.query).toBe('al');
    });

    it('uses default limit of 10', async () => {
      const { service, repository } = createService();
      repository.searchTerms.mockResolvedValue([]);

      await service.searchTerms({ query: 'test' });

      expect(repository.searchTerms).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('bulkEnrich', () => {
    it('enriches each term using text and context from request', async () => {
      const { service, enrichUseCase } = createService();
      const aggregate1 = createTestAggregate({ term: 'term1' });
      const aggregate2 = createTestAggregate({ term: 'term2' });

      enrichUseCase.execute
        .mockResolvedValueOnce({
          aggregate: aggregate1,
          cached: false,
          latencyMs: 50,
        })
        .mockResolvedValueOnce({
          aggregate: aggregate2,
          cached: true,
          latencyMs: 5,
        });

      const result = await service.bulkEnrich({
        terms: [
          { text: 'term1', context: 'ctx1' },
          { text: 'term2', context: 'ctx2' },
        ],
      });

      expect(enrichUseCase.execute).toHaveBeenCalledWith({
        term: 'term1',
        context: 'ctx1',
      });
      expect(enrichUseCase.execute).toHaveBeenCalledWith({
        term: 'term2',
        context: 'ctx2',
      });
      expect(result.definitions).toHaveLength(2);
      expect(result.cacheHitRate).toBe(0.5);
      expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.failedTerms).toEqual([]);
    });

    it('captures failed terms without stopping the batch', async () => {
      const { service, enrichUseCase } = createService();
      const aggregate = createTestAggregate({ term: 'good-term' });

      enrichUseCase.execute
        .mockResolvedValueOnce({
          aggregate,
          cached: false,
          latencyMs: 50,
        })
        .mockRejectedValueOnce(new Error('LLM timeout'));

      const result = await service.bulkEnrich({
        terms: [
          { text: 'good-term', context: 'ctx1' },
          { text: 'bad-term', context: 'ctx2' },
        ],
      });

      expect(result.definitions).toHaveLength(1);
      expect(result.failedTerms).toHaveLength(1);
      expect(result.failedTerms[0].text).toBe('bad-term');
      expect(result.failedTerms[0].reason).toContain('LLM timeout');
    });
  });
});
