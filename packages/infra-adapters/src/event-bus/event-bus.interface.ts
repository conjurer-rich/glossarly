import { DomainEvent } from '@glossarly/domain';

/**
 * Interface for the event bus, responsible for publishing and subscribing to domain events.
 */
export interface IEventBus {
  /**
   * Publish a single domain event.
   * @param event - The domain event to publish
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple domain events.
   * @param events - Array of domain events to publish
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to events of a specific type.
   * @param eventType - The type of event to subscribe to
   * @param handler - Async handler function to execute when event is published
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>
  ): void;
}
