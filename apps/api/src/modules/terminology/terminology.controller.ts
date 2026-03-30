import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TerminologyService } from './terminology.service';
import {
  DefineTerm_Request,
  DefineTerm_Response,
  TermDefinition_Response,
  SearchTerms_Request,
  SearchTerms_Response,
  BulkEnrichTerms_Request,
  BulkEnrichTerms_Response,
  ApiError_Response,
} from '@glossarly/shared';

@ApiTags('Terminology')
@Controller('v1/terminology')
export class TerminologyController {
  constructor(private readonly terminologyService: TerminologyService) {}

  @Post('define')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Define and enrich a new term',
    description:
      'Creates a new term definition and enriches it with LLM-generated content',
  })
  @ApiCreatedResponse({
    description: 'Term successfully defined and enriched',
    type: DefineTerm_Response,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    type: ApiError_Response,
  })
  async defineTerm(
    @Body() request: DefineTerm_Request,
  ): Promise<DefineTerm_Response> {
    const result = await this.terminologyService.defineAndEnrichTerm(request);

    return {
      success: true,
      definition: result.definition,
      cached: result.cached,
      latencyMs: result.latencyMs,
    };
  }

  @Get(':termId')
  @ApiOperation({
    summary: 'Get term definition by ID',
    description: 'Retrieves a specific term definition by its unique identifier',
  })
  @ApiOkResponse({
    description: 'Term definition retrieved successfully',
    type: TermDefinition_Response,
  })
  @ApiNotFoundResponse({
    description: 'Term not found',
    type: ApiError_Response,
  })
  async getTermById(
    @Param('termId') termId: string,
  ): Promise<TermDefinition_Response> {
    return this.terminologyService.getTermDefinition(termId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search for terms',
    description: 'Searches for terms based on query and optional filters',
  })
  @ApiOkResponse({
    description: 'Search completed successfully',
    type: SearchTerms_Response,
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters',
    type: ApiError_Response,
  })
  async searchTerms(
    @Body() request: SearchTerms_Request,
  ): Promise<SearchTerms_Response> {
    return this.terminologyService.searchTerms(request);
  }

  @Post('bulk-enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk enrich multiple terms',
    description: 'Enriches multiple terms in a single request with cache-aware processing',
  })
  @ApiOkResponse({
    description: 'Bulk enrichment completed',
    type: BulkEnrichTerms_Response,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    type: ApiError_Response,
  })
  async bulkEnrich(
    @Body() request: BulkEnrichTerms_Request,
  ): Promise<BulkEnrichTerms_Response> {
    return this.terminologyService.bulkEnrich(request);
  }
}
