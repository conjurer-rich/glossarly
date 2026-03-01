import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainErrorFilter, AllExceptionsFilter } from './shared/filters';
import { RequestIdInterceptor, LoggingInterceptor } from './shared/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Register global interceptors (order matters: RequestId first, then Logging)
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(),
  );

  // Register global exception filters (AllExceptions is the fallback, DomainError is specific)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new DomainErrorFilter(),
  );

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Glossarly API')
    .setDescription(
      'The Glossarly API provides endpoints for managing term definitions and enrichments using CQRS architecture.',
    )
    .setVersion('1.0.0')
    .addTag('Terminology', 'Term definition and enrichment operations')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════╗
║         Glossarly API Started          ║
║  http://localhost:${port}                ║
║  Swagger: http://localhost:${port}/api/docs   ║
╚════════════════════════════════════════╝
  `);
}

bootstrap();
