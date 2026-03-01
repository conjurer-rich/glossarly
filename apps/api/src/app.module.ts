import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './health/health.module';
import { TerminologyModule } from './modules/terminology/terminology.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    HealthModule,
    TerminologyModule,
    // TODO: Glossary, Identity, Billing, Analytics modules
  ],
})
export class AppModule {}
