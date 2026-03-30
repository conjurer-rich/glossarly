import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseConfig {
  private pool: Pool | null = null;

  constructor(private configService: ConfigService) {}

  getPool(): Pool {
    if (!this.pool) {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');

      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      this.pool = new Pool({
        connectionString: databaseUrl,
      });
    }

    return this.pool;
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const databaseProvider = {
  provide: 'DATABASE_POOL',
  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    return new Pool({
      connectionString: databaseUrl,
    });
  },
  inject: [ConfigService],
};
