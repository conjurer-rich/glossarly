import { TermDefinitionAggregate } from '../term-definition.aggregate';
import { TermCategory, TermSource } from '@glossarly/shared';

function createAggregate(
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
    confidence: overrides.confidence ?? 80,
    source: overrides.source ?? TermSource.USER_PROVIDED,
  });
}

describe('TermDefinitionAggregate', () => {
  describe('create', () => {
    it('sets all properties from params', () => {
      const aggregate = createAggregate({
        id: 'agg-1',
        term: 'pipeline',
        definition: 'a sales pipeline',
        example: 'fill the pipeline',
        category: TermCategory.JARGON,
        confidence: 85,
        source: TermSource.AI_GENERATED,
      });

      expect(aggregate.id).toBe('agg-1');
      expect(aggregate.term).toBe('pipeline');
      expect(aggregate.definition).toBe('a sales pipeline');
      expect(aggregate.example).toBe('fill the pipeline');
      expect(aggregate.category).toBe(TermCategory.JARGON);
      expect(aggregate.confidence).toBe(85);
      expect(aggregate.source).toBe(TermSource.AI_GENERATED);
      expect(aggregate.createdAt).toBeInstanceOf(Date);
      expect(aggregate.updatedAt).toBeInstanceOf(Date);
    });

    it('emits TermDefinitionCreated event with correct payload', () => {
      const aggregate = createAggregate({ term: 'synergy' });

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TermDefinitionCreated');
      expect(events[0].aggregateId).toBe('test-id');
      expect(events[0].payload).toEqual(
        expect.objectContaining({ term: 'synergy' }),
      );
    });

    it('rejects empty term', () => {
      expect(() => createAggregate({ term: '' })).toThrow(/term/i);
    });

    it('rejects whitespace-only term', () => {
      expect(() => createAggregate({ term: '   ' })).toThrow(/term/i);
    });

    it('rejects empty definition', () => {
      expect(() => createAggregate({ definition: '' })).toThrow(
        /definition/i,
      );
    });

    it('accepts confidence of exactly 100', () => {
      const aggregate = createAggregate({ confidence: 100 });

      expect(aggregate.confidence).toBe(100);
    });

    it('rejects confidence above 100', () => {
      expect(() => createAggregate({ confidence: 101 })).toThrow(
        /confidence/i,
      );
    });

    it('accepts confidence of exactly 0', () => {
      const aggregate = createAggregate({ confidence: 0 });

      expect(aggregate.confidence).toBe(0);
    });

    it('rejects confidence below 0', () => {
      expect(() => createAggregate({ confidence: -1 })).toThrow(
        /confidence/i,
      );
    });
  });

  describe('updateDefinition', () => {
    it('updates definition, example, and source', () => {
      const aggregate = createAggregate();

      aggregate.updateDefinition({
        definition: 'updated-definition',
        example: 'updated-example',
        source: TermSource.LLM_ENRICHED,
      });

      expect(aggregate.definition).toBe('updated-definition');
      expect(aggregate.example).toBe('updated-example');
      expect(aggregate.source).toBe(TermSource.LLM_ENRICHED);
    });

    it('emits TermDefinitionUpdated event with correct payload', () => {
      const aggregate = createAggregate({ term: 'pipeline' });
      aggregate.clearEvents();

      aggregate.updateDefinition({
        definition: 'new-def',
        example: 'new-example',
        source: TermSource.USER_SUBMITTED,
      });

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TermDefinitionUpdated');
      expect(events[0].payload).toEqual(
        expect.objectContaining({
          term: 'pipeline',
          definition: 'new-def',
          example: 'new-example',
          source: TermSource.USER_SUBMITTED,
        }),
      );
    });

    it('updates the updatedAt timestamp', () => {
      const aggregate = createAggregate();
      const originalUpdatedAt = aggregate.updatedAt;

      aggregate.updateDefinition({
        definition: 'new-def',
        source: TermSource.USER_SUBMITTED,
      });

      expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });

    it('rejects empty definition', () => {
      const aggregate = createAggregate();

      expect(() =>
        aggregate.updateDefinition({
          definition: '',
          source: TermSource.USER_PROVIDED,
        }),
      ).toThrow(/definition/i);
    });

    it('rejects whitespace-only definition', () => {
      const aggregate = createAggregate();

      expect(() =>
        aggregate.updateDefinition({
          definition: '   ',
          source: TermSource.USER_PROVIDED,
        }),
      ).toThrow(/definition/i);
    });
  });

  describe('adjustConfidence', () => {
    it('updates confidence level', () => {
      const aggregate = createAggregate({ confidence: 80 });

      aggregate.adjustConfidence(90, 'Manual review');

      expect(aggregate.confidence).toBe(90);
    });

    it('clamps confidence above 100 to 100', () => {
      const aggregate = createAggregate({ confidence: 50 });

      aggregate.adjustConfidence(150, 'Reason');

      expect(aggregate.confidence).toBe(100);
    });

    it('clamps confidence below 0 to 0', () => {
      const aggregate = createAggregate({ confidence: 50 });

      aggregate.adjustConfidence(-50, 'Reason');

      expect(aggregate.confidence).toBe(0);
    });

    it('records the previous confidence in the event payload', () => {
      const aggregate = createAggregate({ confidence: 80 });
      aggregate.clearEvents();

      aggregate.adjustConfidence(90, 'Manual review');

      const events = aggregate.getUncommittedEvents();
      expect(events[0].payload).toEqual(
        expect.objectContaining({
          previousConfidence: 80,
          newConfidence: 90,
          reason: 'Manual review',
        }),
      );
    });

    it('emits TermConfidenceAdjusted event', () => {
      const aggregate = createAggregate();
      aggregate.clearEvents();

      aggregate.adjustConfidence(90, 'Manual review');

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TermConfidenceAdjusted');
    });

    it('updates the updatedAt timestamp', () => {
      const aggregate = createAggregate();
      const originalUpdatedAt = aggregate.updatedAt;

      aggregate.adjustConfidence(90, 'Reason');

      expect(aggregate.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('toSnapshot and fromSnapshot', () => {
    it('round-trips all fields correctly', () => {
      const original = createAggregate({
        example: 'test-example',
        confidence: 85,
      });

      const snapshot = original.toSnapshot();
      const restored = TermDefinitionAggregate.fromSnapshot(snapshot);

      expect(restored.id).toBe(original.id);
      expect(restored.term).toBe(original.term);
      expect(restored.definition).toBe(original.definition);
      expect(restored.example).toBe(original.example);
      expect(restored.category).toBe(original.category);
      expect(restored.confidence).toBe(original.confidence);
      expect(restored.source).toBe(original.source);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });

    it('toSnapshot returns Date objects for timestamps', () => {
      const aggregate = createAggregate();
      const snapshot = aggregate.toSnapshot();

      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.updatedAt).toBeInstanceOf(Date);
    });

    it('fromSnapshot does not emit events', () => {
      const original = createAggregate();
      const snapshot = original.toSnapshot();
      const restored = TermDefinitionAggregate.fromSnapshot(snapshot);

      expect(restored.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('clearEvents', () => {
    it('removes all accumulated events', () => {
      const aggregate = createAggregate();
      expect(aggregate.getUncommittedEvents().length).toBeGreaterThan(0);

      aggregate.clearEvents();

      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });
});
