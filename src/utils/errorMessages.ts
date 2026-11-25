import { t } from '@/src/i18n';
import {
  AuthRequiredError,
  NetworkError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from '@/src/services/errors';

export interface LocalizedErrorInfo {
  message: string;
  canRetry: boolean;
}

/**
 * Maps typed service errors to localized (EN/UR) user-facing messages
 * and indicates whether a Retry button should be offered (network errors only).
 */
export function getLocalizedError(err: unknown): LocalizedErrorInfo {
  if (err instanceof NetworkError) {
    return { message: t('errors_network'), canRetry: true };
  }
  if (err instanceof AuthRequiredError) {
    return { message: t('errors_auth_required'), canRetry: false };
  }
  if (err instanceof PermissionDeniedError) {
    return { message: t('errors_permission_denied'), canRetry: false };
  }
  if (err instanceof NotFoundError) {
    return { message: t('errors_not_found'), canRetry: false };
  }
  if (err instanceof ValidationError) {
    return { message: err.message || t('errors_validation'), canRetry: false };
  }

  const msg = err instanceof Error ? err.message : '';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
    return { message: t('errors_network'), canRetry: true };
  }

  return { message: msg || t('errors_generic'), canRetry: false };
}
