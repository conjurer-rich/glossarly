import { TermSource } from '@glossarly/shared';
import { IUseCase } from '../shared/use-case';
import { ExternalServiceError } from '../shared/errors';
import { TermDefinitionAggregate } from './term-definition.aggregate';
import { ITermDefinitionRepository } from './term-definition.repository';
import { ITermCache } from './term-cache.interface';
import { ILLMProvider, EnrichTermRequest } from './llm-provider.interface';
import { randomUUID } from 'crypto';

/**
 * Request to enrich a term definition using an LLM provider.
 */
export interface EnrichTermDefinitionRequest extends EnrichTermRequest {
  glossaryId?: string;
}

/**
 * Result from enriching a term definition.
 */
export interface EnrichTermDefinitionResult {
  aggregate: TermDefinitionAggregate;
  cached: boolean;
  latencyMs: number;
}

/**
 * Use case for enriching term definitions using LLM.
 * Checks existing definitions first, then calls LLM if needed.
 */
export class EnrichTermDefinitionUseCase
  implements IUseCase<EnrichTermDefinitionRequest, EnrichTermDefinitionResult>
{
  constructor(
    private repository: ITermDefinitionRepository,
    private cache: ITermCache,
    private llmProvider: ILLMProvider,
  ) {}

  async execute(
    request: EnrichTermDefinitionRequest,
  ): Promise<EnrichTermDefinitionResult> {
    const startTime = Date.now();

    // Check cache first
    const cached = await this.cache.get(request.term);
    if (cached) {
      const latencyMs = Date.now() - startTime;
      return { aggregate: cached, cached: true, latencyMs };
    }

    // Check repository
    const existing = await this.repository.findByTerm(request.term);
    if (existing) {
      await this.cache.set(request.term, existing);
      const latencyMs = Date.now() - startTime;
      return { aggregate: existing, cached: true, latencyMs };
    }

    // Term not found, enrich via LLM
    try {
      const enrichResult = await this.llmProvider.enrichTerm({
        term: request.term,
        context: request.context,
        language: request.language,
      });

      // Create new aggregate from LLM result
      const aggregate = TermDefinitionAggregate.create({
        id: randomUUID(),
        term: request.term,
        definition: enrichResult.definition,
        example: enrichResult.example,
        category: enrichResult.category,
        confidence: enrichResult.confidence,
        source: TermSource.LLM_ENRICHED,
      });

      // Save to repository
      await this.repository.save(aggregate);

      // Cache the result
      await this.cache.set(request.term, aggregate);

      // Clear events after successful persistence
      aggregate.clearEvents();

      const latencyMs = Date.now() - startTime;
      return { aggregate, cached: false, latencyMs };
    } catch (error) {
      throw new ExternalServiceError(
        `LLM enrichment failed for term "${request.term}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
