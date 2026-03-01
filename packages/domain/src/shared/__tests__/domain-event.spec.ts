import { createDomainEvent } from '../domain-event';

describe('createDomainEvent', () => {
  it('creates an event with the given type and payload', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', { key: 'value' });

    expect(event.eventType).toBe('TestEvent');
    expect(event.aggregateId).toBe('agg-1');
    expect(event.payload).toEqual({ key: 'value' });
  });

  it('generates a unique eventId for each call', () => {
    const event1 = createDomainEvent('TestEvent', 'agg-1', {});
    const event2 = createDomainEvent('TestEvent', 'agg-1', {});

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('sets occurredAt to a valid ISO timestamp', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', {});

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

  it('sets version to 1', () => {
    const event = createDomainEvent('TestEvent', 'agg-1', {});

    expect(event.version).toBe(1);
  });
});
