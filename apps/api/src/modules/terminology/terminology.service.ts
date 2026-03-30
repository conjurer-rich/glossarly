import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  GetTermDefinitionUseCase,
  EnrichTermDefinitionUseCase,
  ITermDefinitionRepository,
} from '@glossarly/domain';
import {
  DefineTerm_Request,
  TermDefinition_Response,
  SearchTerms_Request,
  SearchTerms_Response,
  BulkEnrichTerms_Request,
  BulkEnrichTerms_Response,
} from '@glossarly/shared';
import { TermDefinitionMapper } from './term-definition.mapper';

interface EnrichmentResult {
  definition: TermDefinition_Response;
  cached: boolean;
  latencyMs: number;
}

@Injectable()
export class TerminologyService {
  private readonly logger = new Logger(TerminologyService.name);

  constructor(
    @Inject('GET_TERM_USE_CASE')
    private getTermUseCase: GetTermDefinitionUseCase,
    @Inject('ENRICH_TERM_USE_CASE')
    private enrichUseCase: EnrichTermDefinitionUseCase,
    @Inject('TERM_REPOSITORY')
    private repository: ITermDefinitionRepository,
  ) {}

  async defineAndEnrichTerm(
    request: DefineTerm_Request,
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      const result = await this.enrichUseCase.execute({
        term: request.term,
        context: request.context ?? '',
      });

      const latencyMs = Date.now() - startTime;

      return {
        definition: TermDefinitionMapper.toResponse(result.aggregate),
        cached: result.cached,
        latencyMs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to enrich term "${request.term}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getTermDefinition(termId: string): Promise<TermDefinition_Response> {
    try {
      const result = await this.getTermUseCase.execute({ termId });
      return TermDefinitionMapper.toResponse(result.aggregate);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve term "${termId}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async searchTerms(request: SearchTerms_Request): Promise<SearchTerms_Response> {
    try {
      const limit = request.limit ?? 10;
      const aggregates = await this.repository.searchTerms(
        request.query,
        limit,
      );

      return {
        results: TermDefinitionMapper.toResponseList(aggregates),
        totalCount: aggregates.length,
        query: request.query,
      };
    } catch (error) {
      this.logger.error(
        `Search failed for query "${request.query}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async bulkEnrich(
    request: BulkEnrichTerms_Request,
  ): Promise<BulkEnrichTerms_Response> {
    const startTime = Date.now();
    const definitions: TermDefinition_Response[] = [];
    const failedTerms: Array<{ text: string; reason: string }> = [];
    let cacheHits = 0;

    for (const term of request.terms) {
      try {
        const enrichResult = await this.enrichUseCase.execute({
          term: term.text,
          context: term.context,
        });

        if (enrichResult.cached) {
          cacheHits++;
        }

        definitions.push(
          TermDefinitionMapper.toResponse(enrichResult.aggregate),
        );
      } catch (error) {
        failedTerms.push({
          text: term.text,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    return {
      definitions,
      failedTerms,
      cacheHitRate:
        request.terms.length > 0 ? cacheHits / request.terms.length : 0,
      totalLatencyMs,
    };
  }
}
