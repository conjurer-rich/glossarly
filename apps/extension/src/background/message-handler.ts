import {
  DefineTerm_Request,
  DefineTerm_Response,
  SearchTerms_Request,
  SearchTerms_Response
} from '@glossarly/shared';
import { GlossarlyApiClient } from '../api/client';

export class MessageHandler {
  private apiClient: GlossarlyApiClient;

  constructor(apiBaseUrl: string) {
    this.apiClient = new GlossarlyApiClient(apiBaseUrl);
  }

  async handle(
    message: any,
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const { type, payload } = message;

    switch (type) {
      case 'ENRICH_TERM':
        return this.handleEnrichTerm(payload);

      case 'SEARCH_TERMS':
        return this.handleSearchTerms(payload);

      case 'GET_GLOSSARY':
        return this.handleGetGlossary();

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  private async handleEnrichTerm(payload: {
    term: string;
    context: string;
  }): Promise<DefineTerm_Response> {
    const request: DefineTerm_Request = {
      term: payload.term,
      context: payload.context
    };

    return this.apiClient.defineTerm(request);
  }

  private async handleSearchTerms(payload: {
    query: string;
  }): Promise<SearchTerms_Response> {
    const request: SearchTerms_Request = {
      query: payload.query
    };

    return this.apiClient.searchTerms(request);
  }

  private async handleGetGlossary(): Promise<any> {
    // Stub for Phase 2
    return { terms: [] };
  }
}
