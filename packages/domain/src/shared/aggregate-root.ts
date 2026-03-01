import { DomainEvent } from '@glossarly/shared';

/**
 * Abstract base class for domain aggregates.
 * Manages identity, event sourcing, and temporal state.
 */
export abstract class AggregateRoot {
  protected _id: string;
  protected _events: DomainEvent[] = [];
  protected _createdAt: Date;
  protected _updatedAt: Date;

  constructor(id: string, createdAt: Date, updatedAt: Date) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Returns all uncommitted domain events.
   */
  getUncommittedEvents(): DomainEvent[] {
    return this._events;
  }

  /**
   * Clears the uncommitted events list.
   * Should be called after events are persisted.
   */
  clearEvents(): void {
    this._events = [];
  }

  /**
   * Adds a domain event to the uncommitted events list.
   */
  protected addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  /**
   * Marks the aggregate as updated by setting updatedAt to current time.
   */
  protected markUpdated(): void {
    this._updatedAt = new Date();
  }
}
