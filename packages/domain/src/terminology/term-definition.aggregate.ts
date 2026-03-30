import { TermCategory, TermSource } from '@glossarly/shared';
import { AggregateRoot } from '../shared/aggregate-root';
import { createDomainEvent } from '../shared/domain-event';
import { ValidationError } from '../shared/errors';

export interface TermDefinitionSnapshot {
  id: string;
  term: string;
  definition: string;
  example?: string;
  category: TermCategory;
  confidence: number;
  source: TermSource;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TermDefinitionAggregate represents a term and its definition within the domain.
 * This is the core aggregate for term management and enrichment.
 */
export class TermDefinitionAggregate extends AggregateRoot {
  private _term: string;
  private _definition: string;
  private _example?: string;
  private _category: TermCategory;
  private _confidence: number;
  private _source: TermSource;

  private constructor(
    id: string,
    term: string,
    definition: string,
    category: TermCategory,
    confidence: number,
    source: TermSource,
    createdAt: Date,
    updatedAt: Date,
    example?: string,
  ) {
    super(id, createdAt, updatedAt);
    this._term = term;
    this._definition = definition;
    this._example = example;
    this._category = category;
    this._confidence = confidence;
    this._source = source;
  }

  /**
   * Factory method to create a new TermDefinitionAggregate.
   * Validates all inputs and emits a TermDefinitionCreated event.
   */
  static create(params: {
    id: string;
    term: string;
    definition: string;
    example?: string;
    category: TermCategory;
    confidence: number;
    source: TermSource;
  }): TermDefinitionAggregate {
    if (!params.term || params.term.trim().length === 0) {
      throw new ValidationError('Term must not be empty');
    }

    if (!params.definition || params.definition.trim().length === 0) {
      throw new ValidationError('Definition must not be empty');
    }

    if (params.confidence < 0 || params.confidence > 100) {
      throw new ValidationError('Confidence must be between 0 and 100');
    }

    const now = new Date();
    const aggregate = new TermDefinitionAggregate(
      params.id,
      params.term,
      params.definition,
      params.category,
      params.confidence,
      params.source,
      now,
      now,
      params.example,
    );

    aggregate.addEvent(
      createDomainEvent('TermDefinitionCreated', params.id, {
        term: params.term,
        definition: params.definition,
        example: params.example,
        category: params.category,
        confidence: params.confidence,
        source: params.source,
      }),
    );

    return aggregate;
  }

  /**
   * Updates the definition and example of the term.
   * Emits a TermDefinitionUpdated event.
   */
  updateDefinition(params: {
    definition: string;
    example?: string;
    source: TermSource;
  }): void {
    if (!params.definition || params.definition.trim().length === 0) {
      throw new ValidationError('Definition must not be empty');
    }

    this._definition = params.definition;
    this._example = params.example;
    this._source = params.source;
    this.markUpdated();

    this.addEvent(
      createDomainEvent('TermDefinitionUpdated', this._id, {
        term: this._term,
        definition: params.definition,
        example: params.example,
        source: params.source,
      }),
    );
  }

  /**
   * Adjusts the confidence level of the definition.
   * Clamps the value to the range [0, 100].
   */
  adjustConfidence(newConfidence: number, reason: string): void {
    const previousConfidence = this._confidence;
    const clamped = Math.max(0, Math.min(100, newConfidence));
    this._confidence = clamped;
    this.markUpdated();

    this.addEvent(
      createDomainEvent('TermConfidenceAdjusted', this._id, {
        newConfidence: clamped,
        previousConfidence,
        reason,
      }),
    );
  }

  // Getters
  get term(): string {
    return this._term;
  }

  get definition(): string {
    return this._definition;
  }

  get example(): string | undefined {
    return this._example;
  }

  get category(): TermCategory {
    return this._category;
  }

  get confidence(): number {
    return this._confidence;
  }

  get source(): TermSource {
    return this._source;
  }

  /**
   * Serializes the aggregate to a snapshot for persistence.
   */
  toSnapshot(): TermDefinitionSnapshot {
    return {
      id: this._id,
      term: this._term,
      definition: this._definition,
      example: this._example,
      category: this._category,
      confidence: this._confidence,
      source: this._source,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Reconstitutes an aggregate from a snapshot.
   * Does not emit events.
   */
  static fromSnapshot(snapshot: TermDefinitionSnapshot): TermDefinitionAggregate {
    return new TermDefinitionAggregate(
      snapshot.id,
      snapshot.term,
      snapshot.definition,
      snapshot.category,
      snapshot.confidence,
      snapshot.source,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.example,
    );
  }
}
