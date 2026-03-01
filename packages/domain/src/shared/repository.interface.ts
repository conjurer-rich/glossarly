import { AggregateRoot } from './aggregate-root';

/**
 * Generic repository interface for aggregate persistence.
 * Defines the contract for CRUD operations on aggregates.
 */
export interface IRepository<T extends AggregateRoot> {
  /**
   * Persists an aggregate to the underlying storage.
   */
  save(aggregate: T): Promise<void>;

  /**
   * Retrieves an aggregate by its unique identifier.
   * @returns The aggregate or null if not found.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Deletes an aggregate from the underlying storage.
   */
  delete(id: string): Promise<void>;
}
