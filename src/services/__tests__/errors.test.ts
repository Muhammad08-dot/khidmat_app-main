import {
  ServiceError,
  NetworkError,
  AuthRequiredError,
  PermissionDeniedError,
  NotFoundError,
  ValidationError,
  toServiceError,
  handleServiceError,
  wrapServiceCall,
} from '../errors';

describe('Service Error Classes & Reporting (P3-5)', () => {
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

  it('creates PermissionDeniedError with PERMISSION_DENIED code', () => {
    const err = new PermissionDeniedError();
    expect(err.name).toBe('PermissionDeniedError');
    expect(err.code).toBe('PERMISSION_DENIED');
  });

  it('creates NotFoundError with NOT_FOUND code', () => {
    const err = new NotFoundError();
    expect(err.name).toBe('NotFoundError');
    expect(err.code).toBe('NOT_FOUND');
  });

  it('creates ValidationError with VALIDATION_FAILED code and message', () => {
    const err = new ValidationError('Invalid amount');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.userMessage).toBe('Invalid amount');
  });

  it('toServiceError correctly maps PostgREST error codes to typed errors', () => {
    // 42501 permission denied
    const err42501 = toServiceError({ code: '42501', message: 'permission denied for table profiles' });
    expect(err42501).toBeInstanceOf(PermissionDeniedError);
    expect(err42501.code).toBe('PERMISSION_DENIED');

    // 23505 unique violation
    const err23505 = toServiceError({ code: '23505', message: 'duplicate key value violates unique constraint' });
    expect(err23505).toBeInstanceOf(ValidationError);
    expect(err23505.code).toBe('VALIDATION_FAILED');

    // P0002 not found
    const errP0002 = toServiceError({ code: 'P0002', message: 'Booking not found' });
    expect(errP0002).toBeInstanceOf(NotFoundError);
    expect(errP0002.code).toBe('NOT_FOUND');

    // Network / fetch failure
    const errFetch = toServiceError(new Error('TypeError: Failed to fetch'));
    expect(errFetch).toBeInstanceOf(NetworkError);
    expect(errFetch.code).toBe('NETWORK_ERROR');
  });

  it('handleServiceError normalizes, reports, and throws typed error', () => {
    expect(() => {
      handleServiceError({ code: '42501', message: 'Forbidden' });
    }).toThrow(PermissionDeniedError);
  });

  it('wrapServiceCall resolves successfully or rejects with typed ServiceError', async () => {
    const successResult = await wrapServiceCall(async () => 'OK');
    expect(successResult).toBe('OK');

    await expect(
      wrapServiceCall(async () => {
        throw new Error('network timeout ECONNREFUSED');
      })
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
