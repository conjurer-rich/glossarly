import { IUseCase } from '../shared/use-case';
import { EntityNotFoundError } from '../shared/errors';
import { TermDefinitionAggregate } from './term-definition.aggregate';
import { ITermDefinitionRepository } from './term-definition.repository';
import { ITermCache } from './term-cache.interface';

/**
 * Request to retrieve a term definition.
 * Either termId or term must be provided.
 */
export interface GetTermDefinitionRequest {
  termId?: string;
  term?: string;
  glossaryId?: string;
}

/**
 * Result containing the retrieved term definition and cache hit status.
 */
export interface GetTermDefinitionResult {
  aggregate: TermDefinitionAggregate;
  cached: boolean;
}

/**
 * Use case for retrieving a term definition.
 * Checks cache first, then repository, and updates cache on hit.
 */
export class GetTermDefinitionUseCase
  implements IUseCase<GetTermDefinitionRequest, GetTermDefinitionResult>
{
  constructor(
    private repository: ITermDefinitionRepository,
    private cache: ITermCache,
  ) {}

  async execute(
    request: GetTermDefinitionRequest,
  ): Promise<GetTermDefinitionResult> {
    if (!request.termId && !request.term) {
      throw new EntityNotFoundError(
        'Either termId or term must be provided',
      );
    }

    // If searching by term text, try cache first
    if (request.term) {
      const cached = await this.cache.get(request.term);
      if (cached) {
        return { aggregate: cached, cached: true };
      }

      // Fall through to repository
      const aggregate = await this.repository.findByTerm(request.term);
      if (!aggregate) {
        throw new EntityNotFoundError(`Term "${request.term}" not found`);
      }

      // Cache the result
      await this.cache.set(request.term, aggregate);

      return { aggregate, cached: false };
    }

    // If searching by ID, query repository directly
    const aggregate = await this.repository.findById(request.termId!);
    if (!aggregate) {
      throw new EntityNotFoundError(`Term with ID "${request.termId}" not found`);
    }

    // Cache by term text as well
    await this.cache.set(aggregate.term, aggregate);

    return { aggregate, cached: false };
  }
}
