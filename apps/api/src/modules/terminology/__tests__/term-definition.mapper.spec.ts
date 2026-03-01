import { TermDefinitionMapper } from '../term-definition.mapper';
import { TermDefinitionAggregate } from '@glossarly/domain';
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

describe('TermDefinitionMapper', () => {
  describe('toResponse', () => {
    it('maps all aggregate fields to the response shape', () => {
      const aggregate = createTestAggregate({
        id: 'resp-id',
        term: 'pipeline',
        definition: 'a sales pipeline',
        example: 'fill the pipeline',
        category: TermCategory.JARGON,
        confidence: 90,
        source: TermSource.AI_GENERATED,
      });

      const response = TermDefinitionMapper.toResponse(aggregate);

      expect(response.id).toBe('resp-id');
      expect(response.term).toBe('pipeline');
      expect(response.definition).toBe('a sales pipeline');
      expect(response.example).toBe('fill the pipeline');
      expect(response.category).toBe(TermCategory.JARGON);
      expect(response.confidence).toBe(90);
      expect(response.source).toBe(TermSource.AI_GENERATED);
    });

    it('serializes createdAt and updatedAt as ISO strings', () => {
      const aggregate = createTestAggregate();

      const response = TermDefinitionMapper.toResponse(aggregate);

      expect(typeof response.createdAt).toBe('string');
      expect(typeof response.updatedAt).toBe('string');
      expect(new Date(response.createdAt).toISOString()).toBe(
        response.createdAt,
      );
      expect(new Date(response.updatedAt).toISOString()).toBe(
        response.updatedAt,
      );
    });

    it('handles aggregate without example', () => {
      const aggregate = createTestAggregate();

      const response = TermDefinitionMapper.toResponse(aggregate);

      expect(response.example).toBeUndefined();
    });
  });

  describe('toResponseList', () => {
    it('maps an array of aggregates to response array', () => {
      const aggregates = [
        createTestAggregate({ id: 'a', term: 'alpha' }),
        createTestAggregate({ id: 'b', term: 'beta' }),
      ];

      const responses = TermDefinitionMapper.toResponseList(aggregates);

      expect(responses).toHaveLength(2);
      expect(responses[0].id).toBe('a');
      expect(responses[1].id).toBe('b');
    });

    it('returns empty array for empty input', () => {
      const responses = TermDefinitionMapper.toResponseList([]);

      expect(responses).toEqual([]);
    });
  });
});
