import { LLMConfig, llmProvider } from '../llm.config';
import { ConfigService } from '@nestjs/config';

function createMockConfigService(
  values: Record<string, string | undefined> = {},
): jest.Mocked<ConfigService> {
  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      return values[key] ?? defaultValue;
    }),
  } as unknown as jest.Mocked<ConfigService>;
}

describe('LLMConfig', () => {
  it('creates an OpenAI provider when LLM_PROVIDER is openai', () => {
    const configService = createMockConfigService({
      LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test-key',
    });

    const config = new LLMConfig(configService);
    const provider = config.getProvider();

    expect(provider).toBeDefined();
    expect(provider.enrichTerm).toBeDefined();
  });

  it('creates an Anthropic provider when LLM_PROVIDER is anthropic', () => {
    const configService = createMockConfigService({
      LLM_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
    });

    const config = new LLMConfig(configService);
    const provider = config.getProvider();

    expect(provider).toBeDefined();
    expect(provider.enrichTerm).toBeDefined();
  });

  it('defaults to openai when LLM_PROVIDER is not set', () => {
    const configService = createMockConfigService({
      OPENAI_API_KEY: 'sk-test-key',
    });

    const config = new LLMConfig(configService);
    const provider = config.getProvider();

    expect(provider).toBeDefined();
  });

  it('caches the provider instance across multiple calls', () => {
    const configService = createMockConfigService({
      LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test-key',
    });

    const config = new LLMConfig(configService);
    const first = config.getProvider();
    const second = config.getProvider();

    expect(first).toBe(second);
  });
});

describe('llmProvider factory', () => {
  it('creates a provider using the factory function', () => {
    const configService = createMockConfigService({
      LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-factory-key',
    });

    const provider = llmProvider.useFactory(configService);

    expect(provider).toBeDefined();
    expect(provider.enrichTerm).toBeDefined();
  });
});
