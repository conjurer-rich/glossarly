import Redis from 'ioredis';
import {
  ITermCache,
  TermDefinitionAggregate,
  DomainError,
} from '@glossarly/domain';

/**
 * Redis implementation of ITermCache.
 * Provides fast, in-memory caching of term definitions with TTL support.
 */
export class RedisTermCache implements ITermCache {
  private readonly keyPrefix = 'glossarly:term:';

  constructor(private readonly redis: Redis) {}

  /**
   * Retrieve a cached term definition by its term string.
   */
  async get(term: string): Promise<TermDefinitionAggregate | null> {
    const key = this.buildKey(term);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }
      const snapshot = JSON.parse(data);
      return TermDefinitionAggregate.fromSnapshot(snapshot);
    } catch (error) {
      throw new DomainError(
        `Failed to retrieve term from cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store a term definition in the cache with a TTL.
   * Default TTL is 24 hours (86400 seconds).
   */
  async set(
    term: string,
    aggregate: TermDefinitionAggregate,
    ttlSeconds: number = 86400
  ): Promise<void> {
    const key = this.buildKey(term);
    const snapshot = aggregate.toSnapshot();

    try {
      await this.redis.setex(
        key,
        ttlSeconds,
        JSON.stringify(snapshot)
      );
    } catch (error) {
      throw new DomainError(
        `Failed to cache term: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Invalidate a cached term by deleting its key.
   */
  async invalidate(term: string): Promise<void> {
    const key = this.buildKey(term);

    try {
      await this.redis.del(key);
    } catch (error) {
      throw new DomainError(
        `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all cached terms.
   * Uses SCAN to iterate through keys with the glossarly prefix and deletes them.
   */
  async clear(): Promise<void> {
    try {
      let cursor = '0';
      const pattern = `${this.keyPrefix}*`;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      throw new DomainError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build a Redis key from a term string.
   * @private
   */
  private buildKey(term: string): string {
    return `${this.keyPrefix}${term.toLowerCase()}`;
  }
}
