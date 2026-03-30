import { AllExceptionsFilter } from '../all-exceptions.filter';
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

describe('AllExceptionsFilter', () => {
  it('returns 500 with INTERNAL_ERROR code for Error instances', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createMockHost();

    filter.catch(new Error('Something broke'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.message).toBe('Something broke');
    expect(body.timestamp).toBeDefined();
    expect(body.requestId).toBeDefined();
  });

  it('returns generic message for non-Error exceptions', () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = createMockHost();

    filter.catch('string error', host);

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('An unexpected error occurred');
  });

  it('uses x-request-id header when available', () => {
    const filter = new AllExceptionsFilter();
    const { host, json, request } = createMockHost();
    request.headers = { 'x-request-id': 'req-456' };

    filter.catch(new Error('fail'), host);

    const body = json.mock.calls[0][0];
    expect(body.requestId).toBe('req-456');
  });
});
