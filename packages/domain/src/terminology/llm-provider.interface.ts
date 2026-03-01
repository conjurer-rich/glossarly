import { TermCategory } from '@glossarly/shared';

/**
 * Request object for LLM enrichment of a term.
 */
export interface EnrichTermRequest {
  term: string;
  context: string;
  language?: string;
}

/**
 * Result from LLM enrichment of a term.
 */
export interface EnrichTermResult {
  definition: string;
  example: string;
  confidence: number;
  category: TermCategory;
  tokensUsed: number;
}

/**
 * Interface for interacting with Language Model providers.
 * Implementations should handle API calls and error handling.
 */
export interface ILLMProvider {
  /**
   * Enriches a term using LLM capabilities.
   * Returns a structured result with definition, example, and confidence.
   */
  enrichTerm(request: EnrichTermRequest): Promise<EnrichTermResult>;
}
