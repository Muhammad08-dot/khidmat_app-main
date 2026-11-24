/**
 * src/services/errors.ts
 * Standardized typed error definitions for service and network calls (P3-5).
 */

export type ServiceErrorCode =
  | 'CONFIG_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'PAYMENT_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN_SERVICE_ERROR';

export class ServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly userMessage: string;
  public readonly originalError?: unknown;

  constructor(
    userMessage: string,
    code: ServiceErrorCode = 'UNKNOWN_SERVICE_ERROR',
    originalError?: unknown
  ) {
    super(userMessage);
    this.name = 'ServiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

export class NetworkError extends ServiceError {
  constructor(
    userMessage = 'Network connection failure. Please check your internet connection.',
    originalError?: unknown
  ) {
    super(userMessage, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

export class AuthRequiredError extends ServiceError {
  constructor(
    userMessage = 'You must be signed in to perform this operation.',
    originalError?: unknown
  ) {
    super(userMessage, 'AUTH_REQUIRED', originalError);
    this.name = 'AuthRequiredError';
  }
}

export class ValidationError extends ServiceError {
  constructor(userMessage: string, originalError?: unknown) {
    super(userMessage, 'VALIDATION_FAILED', originalError);
    this.name = 'ValidationError';
  }
}
