import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  EntityNotFoundError,
  ValidationError,
  ExternalServiceError,
} from '@glossarly/domain';
import { ApiError_Response, ERROR_CODES } from '@glossarly/shared';
import { randomUUID } from 'crypto';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ERROR_CODES.INTERNAL_ERROR;

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      errorCode = ERROR_CODES.TERM_NOT_FOUND;
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
    } else if (exception instanceof ExternalServiceError) {
      status = HttpStatus.BAD_GATEWAY;
      errorCode = ERROR_CODES.LLM_PROVIDER_ERROR;
    }

    const errorResponse: ApiError_Response = {
      code: errorCode,
      message: exception.message,
      timestamp: new Date().toISOString(),
      requestId: request.headers?.['x-request-id'] ?? randomUUID(),
    };

    response.status(status).json(errorResponse);
  }
}
