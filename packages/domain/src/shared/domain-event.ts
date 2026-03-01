import { DomainEvent } from '@glossarly/shared';
import { randomUUID } from 'crypto';

/**
 * Factory function to create domain events with consistent structure.
 * Generates unique event IDs and timestamps.
 */
export function createDomainEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  aggregateType: string = 'TermDefinition',
): DomainEvent {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: new Date().toISOString(),
    version: 1,
  };
}
