import {
  ILLMProvider,
  EnrichTermRequest,
  EnrichTermResult,
  ExternalServiceError,
} from '@glossarly/domain';

/**
 * Anthropic implementation of ILLMProvider.
 * Uses the Anthropic API to enrich terms with definitions, examples, and confidence scores.
 */
export class AnthropicProvider implements ILLMProvider {
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.anthropic.com/v1';

  /**
   * Initialize the Anthropic provider with an API key and optional model selection.
   * @param apiKey - Anthropic API key
   * @param model - Model to use (default: 'claude-sonnet-4-20250514')
   */
  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Enrich a term with definition, example, confidence, and category.
   * Uses Anthropic's JSON response format.
   */
  async enrichTerm(request: EnrichTermRequest): Promise<EnrichTermResult> {
    const systemPrompt = `You are a terminology expert. Given a term and its surrounding context, provide a JSON object with these exact fields:
1. "definition" - a clear, plain-English definition (1-2 sentences)
2. "example" - an example sentence showing the term in use
3. "confidence" - a confidence score 0-100
4. "category" - a category classification (e.g., JARGON, TECHNICAL, DOMAIN_SPECIFIC, SCIENTIFIC, BUSINESS, CASUAL)

Always return valid JSON.`;

    const userMessage = request.context
      ? `Term: "${request.term}"\nContext: ${request.context}`
      : `Term: "${request.term}"`;

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          `Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      if (!data.content?.[0]?.text) {
        throw new Error('No content in Anthropic response');
      }

      const result = JSON.parse(data.content[0].text);
      const tokensUsed =
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

      return {
        definition: result.definition,
        example: result.example,
        confidence: Math.min(100, Math.max(0, result.confidence)),
        category: result.category,
        tokensUsed,
      };
    } catch (error) {
      throw new ExternalServiceError(
        `Anthropic enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
