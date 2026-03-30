import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError_Response, ERROR_CODES } from '@glossarly/shared';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    this.logger.error(
      `Unhandled exception in ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const errorResponse: ApiError_Response = {
      code: ERROR_CODES.INTERNAL_ERROR,
      message:
        exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: request.headers?.['x-request-id'] ?? randomUUID(),
    };

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse);
  }
}
