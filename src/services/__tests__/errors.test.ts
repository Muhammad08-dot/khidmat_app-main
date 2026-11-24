import { ServiceError, NetworkError, AuthRequiredError, ValidationError } from '../errors';

describe('Service Error Classes (P3-5)', () => {
  it('creates ServiceError with default code and custom message', () => {
    const err = new ServiceError('Operation failed');
    expect(err.name).toBe('ServiceError');
    expect(err.userMessage).toBe('Operation failed');
    expect(err.code).toBe('UNKNOWN_SERVICE_ERROR');
  });

  it('creates NetworkError with default message and NETWORK_ERROR code', () => {
    const err = new NetworkError();
    expect(err.name).toBe('NetworkError');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.userMessage).toContain('Network connection failure');
  });

  it('creates AuthRequiredError with AUTH_REQUIRED code', () => {
    const err = new AuthRequiredError();
    expect(err.name).toBe('AuthRequiredError');
    expect(err.code).toBe('AUTH_REQUIRED');
  });

  it('creates ValidationError with VALIDATION_FAILED code and message', () => {
    const err = new ValidationError('Invalid amount');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.userMessage).toBe('Invalid amount');
  });
});
