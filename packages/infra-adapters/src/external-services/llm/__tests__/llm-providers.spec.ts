import { ExternalServiceError } from '@glossarly/domain';
import { OpenAIProvider } from '../openai-provider';
import { AnthropicProvider } from '../anthropic-provider';
import { createLLMProvider } from '../llm-config';
import { EnrichTermRequest } from '../llm-provider.interface';

function createRequest(overrides: Partial<EnrichTermRequest> = {}): EnrichTermRequest {
  return {
    term: 'pipeline',
    context: 'Our data pipeline processes events in real-time.',
    ...overrides,
  };
}

function mockFetchSuccess(responseBody: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(responseBody),
  });
}

function mockFetchError(status: number, errorMessage: string) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message: errorMessage } }),
  });
}

const openAISuccessResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          definition: 'A series of data processing steps.',
          example: 'The ETL pipeline runs nightly.',
          confidence: 85,
          category: 'TECHNICAL',
        }),
      },
    },
  ],
  usage: { total_tokens: 150 },
};

const anthropicSuccessResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        definition: 'A series of data processing steps.',
        example: 'The ETL pipeline runs nightly.',
        confidence: 85,
        category: 'TECHNICAL',
      }),
    },
  ],
  usage: { input_tokens: 50, output_tokens: 100 },
};

describe('createLLMProvider', () => {
  it('creates an OpenAI provider when provider is openai', () => {
    const provider = createLLMProvider({ provider: 'openai', apiKey: 'sk-test' });

    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('creates an Anthropic provider when provider is anthropic', () => {
    const provider = createLLMProvider({ provider: 'anthropic', apiKey: 'sk-ant-test' });

    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('throws for unsupported provider', () => {
    expect(() =>
      createLLMProvider({ provider: 'gemini' as 'openai', apiKey: 'key' })
    ).toThrow('Unsupported LLM provider');
  });
});

describe('OpenAIProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('throws when API key is empty', () => {
      expect(() => new OpenAIProvider('')).toThrow('OpenAI API key is required');
    });

    it('accepts a valid API key', () => {
      expect(() => new OpenAIProvider('sk-test')).not.toThrow();
    });
  });

  describe('enrichTerm', () => {
    it('returns structured result from a successful API call', async () => {
      global.fetch = mockFetchSuccess(openAISuccessResponse);
      const provider = new OpenAIProvider('sk-test');

      const result = await provider.enrichTerm(createRequest());

      expect(result).toEqual({
        definition: 'A series of data processing steps.',
        example: 'The ETL pipeline runs nightly.',
        confidence: 85,
        category: 'TECHNICAL',
        tokensUsed: 150,
      });
    });

    it('sends correct request structure to OpenAI API', async () => {
      global.fetch = mockFetchSuccess(openAISuccessResponse);
      const provider = new OpenAIProvider('sk-test', 'gpt-4o-mini');

      await provider.enrichTerm(createRequest({ term: 'synergy', context: 'Team synergy is key.' }));

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
          }),
        })
      );
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.messages[1].content).toContain('synergy');
      expect(body.messages[1].content).toContain('Team synergy is key.');
    });

    it('omits context from user message when not provided', async () => {
      global.fetch = mockFetchSuccess(openAISuccessResponse);
      const provider = new OpenAIProvider('sk-test');

      await provider.enrichTerm(createRequest({ term: 'agile', context: '' }));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.messages[1].content).toBe('Term: "agile"');
    });

    it('clamps confidence to 0-100 range', async () => {
      const responseWithHighConfidence = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                definition: 'def',
                example: 'ex',
                confidence: 150,
                category: 'BUSINESS',
              }),
            },
          },
        ],
        usage: { total_tokens: 10 },
      };
      global.fetch = mockFetchSuccess(responseWithHighConfidence);
      const provider = new OpenAIProvider('sk-test');

      const result = await provider.enrichTerm(createRequest());

      expect(result.confidence).toBe(100);
    });

    it('throws ExternalServiceError on API failure', async () => {
      global.fetch = mockFetchError(429, 'Rate limit exceeded');
      const provider = new OpenAIProvider('sk-test');

      await expect(provider.enrichTerm(createRequest())).rejects.toThrow(ExternalServiceError);
    });

    it('throws ExternalServiceError when response has no content', async () => {
      global.fetch = mockFetchSuccess({ choices: [] });
      const provider = new OpenAIProvider('sk-test');

      await expect(provider.enrichTerm(createRequest())).rejects.toThrow(ExternalServiceError);
    });
  });
});

describe('AnthropicProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('throws when API key is empty', () => {
      expect(() => new AnthropicProvider('')).toThrow('Anthropic API key is required');
    });

    it('accepts a valid API key', () => {
      expect(() => new AnthropicProvider('sk-ant-test')).not.toThrow();
    });
  });

  describe('enrichTerm', () => {
    it('returns structured result from a successful API call', async () => {
      global.fetch = mockFetchSuccess(anthropicSuccessResponse);
      const provider = new AnthropicProvider('sk-ant-test');

      const result = await provider.enrichTerm(createRequest());

      expect(result).toEqual({
        definition: 'A series of data processing steps.',
        example: 'The ETL pipeline runs nightly.',
        confidence: 85,
        category: 'TECHNICAL',
        tokensUsed: 150,
      });
    });

    it('sends correct request structure to Anthropic API', async () => {
      global.fetch = mockFetchSuccess(anthropicSuccessResponse);
      const provider = new AnthropicProvider('sk-ant-test', 'claude-haiku-4-5-20251001');

      await provider.enrichTerm(createRequest({ term: 'churn', context: 'Customer churn is rising.' }));

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.model).toBe('claude-haiku-4-5-20251001');
      expect(body.messages[0].content).toContain('churn');
    });

    it('sums input and output tokens for total usage', async () => {
      const response = {
        content: [{ type: 'text', text: JSON.stringify({ definition: 'd', example: 'e', confidence: 50, category: 'BUSINESS' }) }],
        usage: { input_tokens: 30, output_tokens: 70 },
      };
      global.fetch = mockFetchSuccess(response);
      const provider = new AnthropicProvider('sk-ant-test');

      const result = await provider.enrichTerm(createRequest());

      expect(result.tokensUsed).toBe(100);
    });

    it('throws ExternalServiceError on API failure', async () => {
      global.fetch = mockFetchError(500, 'Internal server error');
      const provider = new AnthropicProvider('sk-ant-test');

      await expect(provider.enrichTerm(createRequest())).rejects.toThrow(ExternalServiceError);
    });

    it('throws ExternalServiceError when response has no content', async () => {
      global.fetch = mockFetchSuccess({ content: [] });
      const provider = new AnthropicProvider('sk-ant-test');

      await expect(provider.enrichTerm(createRequest())).rejects.toThrow(ExternalServiceError);
    });
  });
});
