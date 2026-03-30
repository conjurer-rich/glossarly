import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILLMProvider } from '@glossarly/domain';
import { createLLMProvider } from '@glossarly/infra-adapters';

function resolveApiKey(
  provider: 'openai' | 'anthropic',
  configService: ConfigService,
): string {
  const key =
    provider === 'openai'
      ? configService.get<string>('OPENAI_API_KEY')
      : configService.get<string>('ANTHROPIC_API_KEY');
  return key ?? '';
}

@Injectable()
export class LLMConfig {
  private provider: ILLMProvider | null = null;

  constructor(private configService: ConfigService) {}

  getProvider(): ILLMProvider {
    if (!this.provider) {
      const providerType = this.configService.get<string>(
        'LLM_PROVIDER',
        'openai',
      ) as 'openai' | 'anthropic';

      this.provider = createLLMProvider({
        provider: providerType,
        apiKey: resolveApiKey(providerType, this.configService),
      });
    }

    return this.provider;
  }
}

export const llmProvider = {
  provide: 'LLM_PROVIDER',
  useFactory: (configService: ConfigService): ILLMProvider => {
    const providerType = configService.get<string>(
      'LLM_PROVIDER',
      'openai',
    ) as 'openai' | 'anthropic';

    return createLLMProvider({
      provider: providerType,
      apiKey: resolveApiKey(providerType, configService),
    });
  },
  inject: [ConfigService],
};
