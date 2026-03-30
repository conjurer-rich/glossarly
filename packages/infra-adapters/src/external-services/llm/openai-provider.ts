import {
  ILLMProvider,
  EnrichTermRequest,
  EnrichTermResult,
  ExternalServiceError,
} from '@glossarly/domain';

/**
 * OpenAI implementation of ILLMProvider.
 * Uses the OpenAI API to enrich terms with definitions, examples, and confidence scores.
 */
export class OpenAIProvider implements ILLMProvider {
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.openai.com/v1';

  /**
   * Initialize the OpenAI provider with an API key and optional model selection.
   * @param apiKey - OpenAI API key
   * @param model - Model to use (default: 'gpt-4o')
   */
  constructor(apiKey: string, model: string = 'gpt-4o') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Enrich a term with definition, example, confidence, and category.
   * Uses OpenAI's JSON mode for structured output.
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
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          response_format: {
            type: 'json_object',
          },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens?: number };
      };

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      const result = JSON.parse(data.choices[0].message.content);
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        definition: result.definition,
        example: result.example,
        confidence: Math.min(100, Math.max(0, result.confidence)),
        category: result.category,
        tokensUsed,
      };
    } catch (error) {
      throw new ExternalServiceError(
        `OpenAI enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
