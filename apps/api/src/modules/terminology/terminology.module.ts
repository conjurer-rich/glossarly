import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import {
  GetTermDefinitionUseCase,
  EnrichTermDefinitionUseCase,
  ITermDefinitionRepository,
  ITermCache,
  ILLMProvider,
} from '@glossarly/domain';
import {
  PostgresTermDefinitionRepository,
  RedisTermCache,
  createLLMProvider,
} from '@glossarly/infra-adapters';
import { databaseProvider } from '../../config/database.config';
import { cacheProvider } from '../../config/cache.config';
import { llmProvider } from '../../config/llm.config';
import { TerminologyController } from './terminology.controller';
import { TerminologyService } from './terminology.service';

@Module({
  imports: [CqrsModule],
  controllers: [TerminologyController],
  providers: [
    databaseProvider,
    cacheProvider,
    llmProvider,
    TerminologyService,
    {
      provide: 'ITermDefinitionRepository',
      useFactory: (pool: any) => {
        return new PostgresTermDefinitionRepository(pool);
      },
      inject: ['DATABASE_POOL'],
    },
    {
      provide: 'ITermCache',
      useFactory: (redisClient: any) => {
        return new RedisTermCache(redisClient);
      },
      inject: ['REDIS_CLIENT'],
    },
    {
      provide: 'TERM_REPOSITORY',
      useExisting: 'ITermDefinitionRepository',
    },
    {
      provide: 'GET_TERM_USE_CASE',
      useFactory: (repository: ITermDefinitionRepository, cache: ITermCache) => {
        return new GetTermDefinitionUseCase(repository, cache);
      },
      inject: ['ITermDefinitionRepository', 'ITermCache'],
    },
    {
      provide: 'ENRICH_TERM_USE_CASE',
      useFactory: (
        repository: ITermDefinitionRepository,
        cache: ITermCache,
        llmProvider: ILLMProvider,
      ) => {
        return new EnrichTermDefinitionUseCase(repository, cache, llmProvider);
      },
      inject: ['ITermDefinitionRepository', 'ITermCache', 'LLM_PROVIDER'],
    },
  ],
  exports: [TerminologyService],
})
export class TerminologyModule {}
