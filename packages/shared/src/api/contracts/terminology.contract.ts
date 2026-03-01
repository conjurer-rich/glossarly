/**
 * API contracts for the Terminology bounded context
 * Handles term definitions, enrichment, and search operations
 */

import { TermCategory, TermSource } from './types';

/**
 * Request to define a new term
 */
export interface DefineTerm_Request {
  /** The term to be defined */
  term: string;
  /** Optional context where the term is used */
  context?: string;
  /** Optional category for the term */
  termCategory?: TermCategory;
  /** Optional glossary ID to associate the definition with */
  glossaryId?: string;
}

/**
 * Request to retrieve a term definition
 */
export interface GetTermDefinition_Request {
  /** Unique identifier of the term */
  termId: string;
}

/**
 * Request to search for terms
 */
export interface SearchTerms_Request {
  /** Search query string */
  query: string;
  /** Optional maximum number of results to return */
  limit?: number;
  /** Optional category filter */
  category?: TermCategory;
  /** Optional glossary ID filter */
  glossaryId?: string;
}

/**
 * Request to update an existing term definition
 */
export interface UpdateTermDefinition_Request {
  /** Unique identifier of the term to update */
  termId: string;
  /** New definition text */
  definition: string;
  /** Optional example of term usage */
  example?: string;
  /** Optional confidence score (0-1) */
  confidence?: number;
}

/**
 * Request to enrich multiple terms in bulk
 */
export interface BulkEnrichTerms_Request {
  /** Array of terms with their contexts */
  terms: Array<{
    /** The term text to enrich */
    text: string;
    /** Context where the term appears */
    context: string;
  }>;
  /** Optional glossary ID to associate enrichment with */
  glossaryId?: string;
}

/**
 * Response containing a term definition
 */
export interface TermDefinition_Response {
  /** Unique identifier of the term definition */
  id: string;
  /** The term being defined */
  term: string;
  /** The definition text */
  definition: string;
  /** Optional example of the term in use */
  example?: string;
  /** Category of the term */
  category: TermCategory;
  /** Confidence score (0-1) indicating definition quality */
  confidence: number;
  /** Source of the definition */
  source: TermSource;
  /** Optional associated glossary ID */
  glossaryId?: string;
  /** ISO timestamp when the definition was created */
  createdAt: string;
  /** ISO timestamp when the definition was last updated */
  updatedAt: string;
  /** Optional metadata about the definition */
  metadata?: {
    /** AI provider used for generation, if applicable */
    aiProvider?: string;
    /** Whether this definition was retrieved from cache */
    cacheHit?: boolean;
  };
}

/**
 * Response after defining a term
 */
export interface DefineTerm_Response {
  /** Whether the operation was successful */
  success: boolean;
  /** The resulting term definition */
  definition: TermDefinition_Response;
  /** Whether the result was retrieved from cache */
  cached: boolean;
  /** Operation latency in milliseconds */
  latencyMs: number;
}

/**
 * Response containing search results for terms
 */
export interface SearchTerms_Response {
  /** Array of matching term definitions */
  results: TermDefinition_Response[];
  /** Total count of matching results */
  totalCount: number;
  /** The search query that was executed */
  query: string;
}

/**
 * Response from bulk term enrichment
 */
export interface BulkEnrichTerms_Response {
  /** Array of successfully enriched term definitions */
  definitions: TermDefinition_Response[];
  /** Array of terms that failed to enrich with reasons */
  failedTerms: Array<{
    /** The term text that failed */
    text: string;
    /** Reason why enrichment failed */
    reason: string;
  }>;
  /** Percentage of terms retrieved from cache (0-1) */
  cacheHitRate: number;
  /** Total latency for the entire bulk operation in milliseconds */
  totalLatencyMs: number;
}
