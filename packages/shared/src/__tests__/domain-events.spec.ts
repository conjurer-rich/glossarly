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

  it('works without optional aggregateType and version', () => {
    const event: DomainEvent = {
      eventId: 'evt-1',
      eventType: 'TestEvent',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-1',
      payload: {},
    };

    expect(event.aggregateType).toBeUndefined();
    expect(event.version).toBeUndefined();
  });
});
