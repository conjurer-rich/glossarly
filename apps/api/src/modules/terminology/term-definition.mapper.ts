import { TermDefinitionAggregate } from '@glossarly/domain';
import { TermDefinition_Response } from '@glossarly/shared';

export class TermDefinitionMapper {
  static toResponse(aggregate: TermDefinitionAggregate): TermDefinition_Response {
    const snapshot = aggregate.toSnapshot();

    return {
      id: snapshot.id,
      term: snapshot.term,
      definition: snapshot.definition,
      example: snapshot.example,
      category: snapshot.category,
      confidence: snapshot.confidence,
      source: snapshot.source,
      createdAt: snapshot.createdAt.toISOString(),
      updatedAt: snapshot.updatedAt.toISOString(),
    };
  }

  static toResponseList(
    aggregates: TermDefinitionAggregate[],
  ): TermDefinition_Response[] {
    return aggregates.map((aggregate) => this.toResponse(aggregate));
  }
}
