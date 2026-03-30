import { TermDefinitionAggregate } from './term-definition.aggregate';

/**
 * Interface for caching term definitions.
 * Implementations can use Redis, in-memory stores, or other backends.
 */
export interface ITermCache {
  /**
   * Retrieves a term definition from the cache.
   */
  get(term: string): Promise<TermDefinitionAggregate | null>;

  /**
   * Stores a term definition in the cache.
   * @param ttlSeconds - Optional time-to-live in seconds
   */
  set(
    term: string,
    aggregate: TermDefinitionAggregate,
    ttlSeconds?: number,
  ): Promise<void>;

  /**
   * Removes a specific term from the cache.
   */
  invalidate(term: string): Promise<void>;

  /**
   * Clears all entries from the cache.
   */
  clear(): Promise<void>;
}
