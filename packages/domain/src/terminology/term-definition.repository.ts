import { TermCategory } from '@glossarly/shared';
import { IRepository } from '../shared/repository.interface';
import { TermDefinitionAggregate } from './term-definition.aggregate';

/**
 * Repository interface for TermDefinitionAggregate.
 * Extends the base repository with domain-specific query operations.
 */
export interface ITermDefinitionRepository
  extends IRepository<TermDefinitionAggregate> {
  /**
   * Finds a term definition by the term text.
   */
  findByTerm(term: string): Promise<TermDefinitionAggregate | null>;

  /**
   * Searches for term definitions matching a query string.
   */
  searchTerms(
    query: string,
    limit?: number,
  ): Promise<TermDefinitionAggregate[]>;

  /**
   * Finds all term definitions within a specific category.
   */
  findByCategory(
    category: TermCategory,
    limit?: number,
  ): Promise<TermDefinitionAggregate[]>;

  /**
   * Saves multiple aggregates in a single operation.
   */
  bulkSave(aggregates: TermDefinitionAggregate[]): Promise<void>;
}
