import { DomainErrorFilter } from '../domain-error.filter';
import {
  EntityNotFoundError,
  ValidationError,
  ExternalServiceError,
  DomainError,
} from '@glossarly/domain';
import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@glossarly/shared';

function createMockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/test', headers: {} };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };
  return { host, status, json, request } as {
    host: any;
    status: jest.Mock;
    json: jest.Mock;
    request: any;
  };
}

describe('DomainErrorFilter', () => {
  it('maps EntityNotFoundError to 404 with TERM_NOT_FOUND code', () => {
    const filter = new DomainErrorFilter();
    const { host, status, json } = createMockHost();

    filter.catch(new EntityNotFoundError('Term not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe(ERROR_CODES.TERM_NOT_FOUND);
    expect(body.message).toBe('Term not found');
    expect(body.timestamp).toBeDefined();
    expect(body.requestId).toBeDefined();
  });

  it('maps ValidationError to 400 with VALIDATION_ERROR code', () => {
    const filter = new DomainErrorFilter();
    const { host, status, json } = createMockHost();

    filter.catch(new ValidationError('Invalid input'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(body.message).toBe('Invalid input');
  });

  it('maps ExternalServiceError to 502 with LLM_PROVIDER_ERROR code', () => {
    const filter = new DomainErrorFilter();
    const { host, status, json } = createMockHost();

    filter.catch(new ExternalServiceError('LLM timeout'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe(ERROR_CODES.LLM_PROVIDER_ERROR);
  });

  it('maps unknown DomainError to 500 with INTERNAL_ERROR code', () => {
    const filter = new DomainErrorFilter();
    const { host, status, json } = createMockHost();

    filter.catch(new DomainError('Something went wrong', 'UNKNOWN'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it('uses x-request-id header when available', () => {
    const filter = new DomainErrorFilter();
    const { host, json, request } = createMockHost();
    request.headers = { 'x-request-id': 'req-123' };

    filter.catch(new EntityNotFoundError('Not found'), host);

    const body = json.mock.calls[0][0];
    expect(body.requestId).toBe('req-123');
  });
});
