import { DomainEvent } from '@glossarly/domain';
import { IEventBus } from './event-bus.interface';

/**
 * In-memory implementation of IEventBus.
 * Suitable for testing and development environments.
 * Maintains event handlers in memory with no persistence.
 */
export class InMemoryEventBus implements IEventBus {
  private readonly handlers: Map<
    string,
    Array<(event: DomainEvent) => Promise<void>>
  > = new Map();

  /**
   * Publish a single domain event to all registered handlers.
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventType = (event as { eventType?: string }).eventType || event.constructor.name;
    const eventHandlers = this.handlers.get(eventType) || [];

    const results = eventHandlers.map((handler) =>
      handler(event).catch((error) => {
        console.error(
          `Error handling event ${eventType}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      })
    );

    await Promise.all(results);
  }

  /**
   * Publish multiple domain events sequentially.
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribe to events of a specific type.
   * Multiple handlers can be registered for the same event type.
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
}
