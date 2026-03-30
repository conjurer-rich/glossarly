import { GetTermDefinitionUseCase } from '../get-term-definition.use-case';
import { ITermDefinitionRepository } from '../term-definition.repository';
import { ITermCache } from '../term-cache.interface';
import { TermDefinitionAggregate } from '../term-definition.aggregate';
import { EntityNotFoundError } from '../../shared/errors';
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

function createUseCase() {
  const repository = createMockRepository();
  const cache = createMockCache();
  const useCase = new GetTermDefinitionUseCase(repository, cache);
  return { useCase, repository, cache };
}

describe('GetTermDefinitionUseCase', () => {
  describe('lookup by term text', () => {
    it('returns cached result when term exists in cache', async () => {
      const { useCase, cache, repository } = createUseCase();
      const aggregate = createTestAggregate();
      cache.get.mockResolvedValue(aggregate);

      const result = await useCase.execute({ term: 'test-term' });

      expect(result.aggregate.term).toBe('test-term');
      expect(result.cached).toBe(true);
      expect(cache.get).toHaveBeenCalledWith('test-term');
      expect(repository.findByTerm).not.toHaveBeenCalled();
    });

    it('falls through to repository on cache miss', async () => {
      const { useCase, cache, repository } = createUseCase();
      const aggregate = createTestAggregate();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(aggregate);

      const result = await useCase.execute({ term: 'test-term' });

      expect(result.aggregate.term).toBe('test-term');
      expect(result.cached).toBe(false);
      expect(repository.findByTerm).toHaveBeenCalledWith('test-term');
    });

    it('caches the result after repository hit', async () => {
      const { useCase, cache, repository } = createUseCase();
      const aggregate = createTestAggregate();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(aggregate);

      await useCase.execute({ term: 'test-term' });

      expect(cache.set).toHaveBeenCalledWith('test-term', aggregate);
    });

    it('throws EntityNotFoundError when term not in cache or repository', async () => {
      const { useCase, cache, repository } = createUseCase();
      cache.get.mockResolvedValue(null);
      repository.findByTerm.mockResolvedValue(null);

      await expect(
        useCase.execute({ term: 'nonexistent-term' }),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('lookup by termId', () => {
    it('retrieves from repository by ID and caches result', async () => {
      const { useCase, repository, cache } = createUseCase();
      const aggregate = createTestAggregate({ id: 'lookup-id' });
      repository.findById.mockResolvedValue(aggregate);

      const result = await useCase.execute({ termId: 'lookup-id' });

      expect(result.aggregate.id).toBe('lookup-id');
      expect(repository.findById).toHaveBeenCalledWith('lookup-id');
      expect(cache.set).toHaveBeenCalledWith('test-term', aggregate);
    });

    it('throws EntityNotFoundError when ID not found in repository', async () => {
      const { useCase, repository } = createUseCase();
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ termId: 'nonexistent-id' }),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('validation', () => {
    it('throws when neither termId nor term provided', async () => {
      const { useCase } = createUseCase();

      await expect(useCase.execute({})).rejects.toThrow(EntityNotFoundError);
    });
  });
});
