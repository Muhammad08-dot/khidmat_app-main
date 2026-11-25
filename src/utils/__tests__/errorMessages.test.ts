import { setLang, t } from '@/src/i18n';
import {
  AuthRequiredError,
  NetworkError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from '@/src/services/errors';
import { getLocalizedError } from '../errorMessages';

describe('getLocalizedError (M3-6)', () => {
  afterEach(() => {
    setLang('en');
  });

  it('maps NetworkError to localized message with canRetry=true in EN and UR', () => {
    setLang('en');
    const enRes = getLocalizedError(new NetworkError('timeout'));
    expect(enRes.canRetry).toBe(true);
    expect(enRes.message).toBe(t('errors.network'));

    setLang('ur');
    const urRes = getLocalizedError(new NetworkError('timeout'));
    expect(urRes.canRetry).toBe(true);
    expect(urRes.message).toBe(t('errors.network'));
  });

  it('maps AuthRequiredError and PermissionDeniedError with canRetry=false', () => {
    expect(getLocalizedError(new AuthRequiredError('unauth'))).toEqual({
      message: t('errors.auth_required'),
      canRetry: false,
    });
    expect(getLocalizedError(new PermissionDeniedError('forbidden'))).toEqual({
      message: t('errors.permission_denied'),
      canRetry: false,
    });
    expect(getLocalizedError(new NotFoundError('missing'))).toEqual({
      message: t('errors.not_found'),
      canRetry: false,
    });
    expect(getLocalizedError(new ValidationError('Invalid CNIC'))).toEqual({
      message: 'Invalid CNIC',
      canRetry: false,
    });
  });
});
