/**
 * Domain events for the Glossarly application
 * Events represent significant business occurrences in the domain
 */

/**
 * Base domain event interface
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  aggregateType?: string;
  version?: number;
}

/**
 * Event fired when a term definition is created
 */
export interface TermDefinitionCreated extends DomainEvent {
  eventType: 'TermDefinitionCreated';
  payload: {
    termId: string;
    term: string;
    definition: string;
    category: string;
    glossaryId?: string;
  };
}

/**
 * Event fired when a term definition is updated
 */
export interface TermDefinitionUpdated extends DomainEvent {
  eventType: 'TermDefinitionUpdated';
  payload: {
    termId: string;
    definition: string;
    example?: string;
    confidence?: number;
  };
}

/**
 * Event fired when term enrichment completes
 */
export interface TermEnrichmentCompleted extends DomainEvent {
  eventType: 'TermEnrichmentCompleted';
  payload: {
    termId: string;
    enrichmentSource: string;
    metadata: Record<string, unknown>;
  };
}

/**
 * Event fired when a glossary is created
 */
export interface GlossaryCreated extends DomainEvent {
  eventType: 'GlossaryCreated';
  payload: {
    glossaryId: string;
    name: string;
    type: string;
    ownerId: string;
  };
}

/**
 * Event fired when an entry is added to a glossary
 */
export interface GlossaryEntryAdded extends DomainEvent {
  eventType: 'GlossaryEntryAdded';
  payload: {
    glossaryId: string;
    termId: string;
    term: string;
    addedBy: string;
  };
}

/**
 * Event fired when a glossary is shared with users
 */
export interface GlossaryShared extends DomainEvent {
  eventType: 'GlossaryShared';
  payload: {
    glossaryId: string;
    sharedWith: string[];
    permission: string;
    sharedBy: string;
  };
}

/**
 * Event fired when a user signs up
 */
export interface UserSignedUp extends DomainEvent {
  eventType: 'UserSignedUp';
  payload: {
    userId: string;
    email: string;
    name: string;
    signupSource: string;
  };
}

/**
 * Event fired when a team is created
 */
export interface TeamCreated extends DomainEvent {
  eventType: 'TeamCreated';
  payload: {
    teamId: string;
    name: string;
    ownerId: string;
  };
}

/**
 * Event fired when a subscription is created
 */
export interface SubscriptionCreated extends DomainEvent {
  eventType: 'SubscriptionCreated';
  payload: {
    subscriptionId: string;
    userId: string;
    planType: string;
    billingPeriod: string;
  };
}

/**
 * Event fired when usage is recorded for a subscription
 */
export interface UsageRecorded extends DomainEvent {
  eventType: 'UsageRecorded';
  payload: {
    subscriptionId: string;
    lookupsUsed: number;
    timestamp: string;
  };
}
