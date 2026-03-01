import {
  DefineTerm_Request,
  DefineTerm_Response,
  SearchTerms_Request,
  SearchTerms_Response,
  TermDefinition_Response
} from '@glossarly/shared';

export class GlossarlyApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async defineTerm(request: DefineTerm_Request): Promise<DefineTerm_Response> {
    return this.request<DefineTerm_Response>(
      'POST',
      '/v1/terminology/define',
      request
    );
  }

  async searchTerms(request: SearchTerms_Request): Promise<SearchTerms_Response> {
    return this.request<SearchTerms_Response>(
      'POST',
      '/v1/terminology/search',
      request
    );
  }

  async getTermById(termId: string): Promise<TermDefinition_Response> {
    return this.request<TermDefinition_Response>(
      'GET',
      `/v1/terminology/${termId}`
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add auth token if available
    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${error.message || ''}`
        );
      }

      return response.json();
    } catch (error) {
      console.error(`[Glossarly] API request failed: ${url}`, error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        resolve(result.authToken || null);
      });
    });
  }
}
