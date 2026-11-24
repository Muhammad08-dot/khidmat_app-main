/**
 * src/services/errors.ts
 * Standardized typed error definitions for service and network calls (P3-5).
 */

import { captureError } from './api/errorReporter';

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

export class PermissionDeniedError extends ServiceError {
  constructor(
    userMessage = 'You do not have permission to perform this action.',
    originalError?: unknown
  ) {
    super(userMessage, 'PERMISSION_DENIED', originalError);
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(
    userMessage = 'The requested resource was not found.',
    originalError?: unknown
  ) {
    super(userMessage, 'NOT_FOUND', originalError);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ServiceError {
  constructor(userMessage: string, originalError?: unknown) {
    super(userMessage, 'VALIDATION_FAILED', originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Normalizes any error (PostgREST, Network, Error, or string) into a typed ServiceError.
 */
export function toServiceError(
  error: unknown,
  fallbackMessage = 'An unexpected service error occurred.'
): ServiceError {
  if (error instanceof ServiceError) return error;

  if (error && typeof error === 'object') {
    const e = error as any;
    const code = String(e.code || '');
    const message = String(e.message || fallbackMessage);

    if (
      code === '42501' ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('permission denied')
    ) {
      return new PermissionDeniedError(message || 'Access denied: insufficient permissions.', error);
    }
    if (
      code === '23505' ||
      message.toLowerCase().includes('duplicate key') ||
      message.toLowerCase().includes('already exists')
    ) {
      return new ValidationError(message || 'A conflicting record already exists.', error);
    }
    if (
      code === '22023' ||
      message.includes('Invalid booking status transition') ||
      message.includes('Price tampering')
    ) {
      return new ValidationError(message, error);
    }
    if (code === 'P0002' || message.toLowerCase().includes('not found')) {
      return new NotFoundError(message || 'The requested resource was not found.', error);
    }
    if (
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch') ||
      message.toLowerCase().includes('econnrefused') ||
      message.toLowerCase().includes('offline')
    ) {
      return new NetworkError(message || 'Network connection failed. Please check your connectivity.', error);
    }
    return new ServiceError(message || fallbackMessage, 'UNKNOWN_SERVICE_ERROR', error);
  }

  return new ServiceError(
    typeof error === 'string' ? error : fallbackMessage,
    'UNKNOWN_SERVICE_ERROR',
    error
  );
}

/**
 * Normalizes an error to a typed ServiceError, automatically reports it to the
 * client-side error reporter, and throws.
 */
export function handleServiceError(
  error: unknown,
  fallbackMessage = 'An unexpected service error occurred.'
): never {
  const err = toServiceError(error, fallbackMessage);
  void captureError(err);
  throw err;
}

/**
 * Wraps an async service call to guarantee rejection with a typed ServiceError
 * and automated telemetry reporting.
 */
export async function wrapServiceCall<T>(
  fn: () => Promise<T>,
  fallbackMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    return handleServiceError(err, fallbackMessage);
  }
}
