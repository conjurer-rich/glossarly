import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheConfig {
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {}

  getClient(): Redis {
    if (!this.client) {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      
      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not set');
      }

      this.client = new Redis(redisUrl);
    }

    return this.client;
  }

  async closeClient(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export const cacheProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    return new Redis(redisUrl);
  },
  inject: [ConfigService],
};
