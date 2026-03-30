import { EnrichTermDefinitionUseCase } from '../enrich-term-definition.use-case';
import { ITermDefinitionRepository } from '../term-definition.repository';
import { ITermCache } from '../term-cache.interface';
import { ILLMProvider, EnrichTermResult } from '../llm-provider.interface';
import { TermDefinitionAggregate } from '../term-definition.aggregate';
import { ExternalServiceError } from '../../shared/errors';
import { TermCategory, TermSource } from '@glossarly/shared';

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

function createMockLLMProvider(): jest.Mocked<ILLMProvider> {
  return {
    enrichTerm: jest.fn(),
  };
}

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
    example: overrides.example ?? 'test-example',
    category: overrides.category ?? TermCategory.TECHNOLOGY,
    confidence: overrides.confidence ?? 95,
    source: overrides.source ?? TermSource.USER_PROVIDED,
  });
}

function createLLMResult(
  overrides: Partial<EnrichTermResult> = {},
): EnrichTermResult {
  return {
    definition: overrides.definition ?? 'llm-definition',
    example: overrides.example ?? 'llm-example',
    confidence: overrides.confidence ?? 85,
    category: overrides.category ?? TermCategory.TECHNOLOGY,
    tokensUsed: overrides.tokensUsed ?? 150,
  };
}

function createUseCase() {
  const repository = createMockRepository();
  const cache = createMockCache();
  const llmProvider = createMockLLMProvider();
  const useCase = new EnrichTermDefinitionUseCase(
    repository,
    cache,
    llmProvider,
  );
  return { useCase, repository, cache, llmProvider };
}

describe('EnrichTermDefinitionUseCase', () => {
  describe('when term exists in cache', () => {
    it('returns cached result without calling LLM', async () => {
      const { useCase, cache, llmProvider } = createUseCase();
      const aggregate = createTestAggregate();
      cache.get.mockResolvedValue(aggregate);

      const result = await useCase.execute({
        term: 'test-term',
        context: 'test context',
      });

      expect(result.aggregate.term).toBe('test-term');
      expect(result.cached).toBe(true);
      expect(llmProvider.enrichTerm).not.toHaveBeenCalled();
    });
  });

  describe('when term exists in repository', () => {
    it('returns existing definition and caches it', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      const aggregate = createTestAggregate();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(aggregate);

      const result = await useCase.execute({
        term: 'test-term',
        context: 'test context',
      });

      expect(result.aggregate.term).toBe('test-term');
      expect(result.cached).toBe(true);
      expect(llmProvider.enrichTerm).not.toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith('test-term', aggregate);
    });
  });

  describe('when term is new', () => {
    it('calls LLM, creates aggregate, saves, and caches', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      llmProvider.enrichTerm.mockResolvedValue(createLLMResult());

      const result = await useCase.execute({
        term: 'new-term',
        context: 'new context',
      });

      expect(result.aggregate.term).toBe('new-term');
      expect(result.aggregate.definition).toBe('llm-definition');
      expect(result.aggregate.example).toBe('llm-example');
      expect(result.cached).toBe(false);
      expect(repository.save).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });

    it('forwards language to LLM provider', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      llmProvider.enrichTerm.mockResolvedValue(createLLMResult());

      await useCase.execute({
        term: 'term',
        context: 'context',
        language: 'es',
      });

      expect(llmProvider.enrichTerm).toHaveBeenCalledWith({
        term: 'term',
        context: 'context',
        language: 'es',
      });
    });

    it('records latency of the operation', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      llmProvider.enrichTerm.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(createLLMResult()), 50);
          }),
      );

      const result = await useCase.execute({
        term: 'new-term',
        context: 'context',
      });

      expect(result.latencyMs).toBeGreaterThanOrEqual(40);
    });

    it('clears domain events after successful persistence', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      llmProvider.enrichTerm.mockResolvedValue(createLLMResult());

      const result = await useCase.execute({
        term: 'new-term',
        context: 'context',
      });

      expect(result.aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('wraps LLM errors as ExternalServiceError', async () => {
      const { useCase, cache, repository, llmProvider } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);
      llmProvider.enrichTerm.mockRejectedValue(
        new Error('API rate limit exceeded'),
      );

      await expect(
        useCase.execute({ term: 'new-term', context: 'context' }),
      ).rejects.toThrow(ExternalServiceError);
    });
  });
});
