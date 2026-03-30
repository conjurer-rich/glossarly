import { DomainEvent } from '@glossarly/shared';
import { InMemoryEventBus } from '../in-memory-event-bus';

function createEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: 'evt-1',
    eventType: 'TermDefinitionCreated',
    occurredAt: new Date().toISOString(),
    aggregateId: 'agg-1',
    payload: { term: 'pipeline' },
    ...overrides,
  };
}

function createEventBus() {
  return new InMemoryEventBus();
}

describe('InMemoryEventBus', () => {
  describe('publish', () => {
    it('delivers event to a subscribed handler', async () => {
      const bus = createEventBus();
      const handler = jest.fn().mockResolvedValue(undefined);
      bus.subscribe('TermDefinitionCreated', handler);

      const event = createEvent();
      await bus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('delivers event to multiple handlers for the same event type', async () => {
      const bus = createEventBus();
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      bus.subscribe('TermDefinitionCreated', handler1);
      bus.subscribe('TermDefinitionCreated', handler2);

      await bus.publish(createEvent());

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('does not deliver event to handlers subscribed to different event types', async () => {
      const bus = createEventBus();
      const handler = jest.fn().mockResolvedValue(undefined);
      bus.subscribe('GlossaryCreated', handler);

      await bus.publish(createEvent({ eventType: 'TermDefinitionCreated' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not throw when publishing with no subscribers', async () => {
      const bus = createEventBus();

      await expect(bus.publish(createEvent())).resolves.toBeUndefined();
    });

    it('catches and logs handler errors without rejecting', async () => {
      const bus = createEventBus();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const failingHandler = jest.fn().mockRejectedValue(new Error('handler failed'));
      bus.subscribe('TermDefinitionCreated', failingHandler);

      await expect(bus.publish(createEvent())).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TermDefinitionCreated'),
        'handler failed'
      );
      consoleSpy.mockRestore();
    });

    it('continues delivering to other handlers when one fails', async () => {
      const bus = createEventBus();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const failingHandler = jest.fn().mockRejectedValue(new Error('boom'));
      const successHandler = jest.fn().mockResolvedValue(undefined);
      bus.subscribe('TermDefinitionCreated', failingHandler);
      bus.subscribe('TermDefinitionCreated', successHandler);

      await bus.publish(createEvent());

      expect(successHandler).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('publishAll', () => {
    it('publishes multiple events in order', async () => {
      const bus = createEventBus();
      const receivedEvents: string[] = [];
      bus.subscribe('TermDefinitionCreated', async (event) => {
        receivedEvents.push(event.aggregateId);
      });

      const events = [
        createEvent({ aggregateId: 'first' }),
        createEvent({ aggregateId: 'second' }),
        createEvent({ aggregateId: 'third' }),
      ];

      await bus.publishAll(events);

      expect(receivedEvents).toEqual(['first', 'second', 'third']);
    });

    it('handles empty event array', async () => {
      const bus = createEventBus();

      await expect(bus.publishAll([])).resolves.toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('allows subscribing to multiple event types', async () => {
      const bus = createEventBus();
      const handler = jest.fn().mockResolvedValue(undefined);
      bus.subscribe('TermDefinitionCreated', handler);
      bus.subscribe('GlossaryCreated', handler);

      await bus.publish(createEvent({ eventType: 'TermDefinitionCreated' }));
      await bus.publish(createEvent({ eventType: 'GlossaryCreated' }));

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
