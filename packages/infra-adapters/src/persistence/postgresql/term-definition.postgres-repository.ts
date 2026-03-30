import { Pool, QueryResult } from 'pg';
import {
  ITermDefinitionRepository,
  TermDefinitionAggregate,
  DomainError,
} from '@glossarly/domain';

/**
 * PostgreSQL implementation of ITermDefinitionRepository.
 * Provides persistence for term definitions with full CRUD operations.
 */
export class PostgresTermDefinitionRepository
  implements ITermDefinitionRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Save a term definition aggregate to the database.
   * Uses INSERT ... ON CONFLICT UPDATE to handle create/update scenarios.
   */
  async save(aggregate: TermDefinitionAggregate): Promise<void> {
    const snapshot = aggregate.toSnapshot();
    const query = `
      INSERT INTO term_definitions (
        id, term, definition, example, category, confidence, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        term = $2,
        definition = $3,
        example = $4,
        category = $5,
        confidence = $6,
        source = $7,
        updated_at = $9
    `;

    try {
      await this.pool.query(query, [
        snapshot.id,
        snapshot.term,
        snapshot.definition,
        snapshot.example,
        snapshot.category,
        snapshot.confidence,
        snapshot.source,
        snapshot.createdAt,
        snapshot.updatedAt,
      ]);
    } catch (error) {
      throw new DomainError(
        `Failed to save term definition: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find a term definition by its ID.
   */
  async findById(id: string): Promise<TermDefinitionAggregate | null> {
    const query = 'SELECT * FROM term_definitions WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return TermDefinitionAggregate.fromSnapshot(result.rows[0]);
    } catch (error) {
      throw new DomainError(
        `Failed to find term definition: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find a term definition by the term string (case-insensitive).
   */
  async findByTerm(term: string): Promise<TermDefinitionAggregate | null> {
    const query =
      'SELECT * FROM term_definitions WHERE LOWER(term) = LOWER($1)';

    try {
      const result = await this.pool.query(query, [term]);
      if (result.rows.length === 0) {
        return null;
      }
      return TermDefinitionAggregate.fromSnapshot(result.rows[0]);
    } catch (error) {
      throw new DomainError(
        `Failed to find term definition by term: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for term definitions by a query string.
   * Searches both term and definition fields using ILIKE.
   */
  async searchTerms(
    query: string,
    limit: number = 10
  ): Promise<TermDefinitionAggregate[]> {
    const searchQuery = `
      SELECT * FROM term_definitions
      WHERE term ILIKE $1 OR definition ILIKE $1
      LIMIT $2
    `;

    try {
      const searchPattern = `%${query}%`;
      const result = await this.pool.query(searchQuery, [searchPattern, limit]);
      return result.rows.map((row) =>
        TermDefinitionAggregate.fromSnapshot(row)
      );
    } catch (error) {
      throw new DomainError(
        `Failed to search term definitions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find all term definitions in a specific category.
   */
  async findByCategory(
    category: string,
    limit: number = 10
  ): Promise<TermDefinitionAggregate[]> {
    const query = `
      SELECT * FROM term_definitions
      WHERE category = $1
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [category, limit]);
      return result.rows.map((row) =>
        TermDefinitionAggregate.fromSnapshot(row)
      );
    } catch (error) {
      throw new DomainError(
        `Failed to find term definitions by category: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save multiple aggregates in a single transaction.
   * Ensures atomicity of bulk operations.
   */
  async bulkSave(aggregates: TermDefinitionAggregate[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO term_definitions (
          id, term, definition, example, category, confidence, source, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          term = $2,
          definition = $3,
          example = $4,
          category = $5,
          confidence = $6,
          source = $7,
          updated_at = $9
      `;

      for (const aggregate of aggregates) {
        const snapshot = aggregate.toSnapshot();
        await client.query(query, [
          snapshot.id,
          snapshot.term,
          snapshot.definition,
          snapshot.example,
          snapshot.category,
          snapshot.confidence,
          snapshot.source,
          snapshot.createdAt,
          snapshot.updatedAt,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DomainError(
        `Failed to bulk save term definitions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Delete a term definition by its ID.
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM term_definitions WHERE id = $1';

    try {
      await this.pool.query(query, [id]);
    } catch (error) {
      throw new DomainError(
        `Failed to delete term definition: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
