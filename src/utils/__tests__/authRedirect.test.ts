import { parseAuthRedirectUrl } from '../authUrlParser';

describe('authRedirect deep link handling', () => {
  it('identifies PKCE callback url correctly', () => {
    const callbackUrl = 'khidmat://auth/callback?code=mock_pkce_code_abcdef';
    const parsed = parseAuthRedirectUrl(callbackUrl);
    expect(parsed.type).toBe('code');
    expect(parsed.code).toBe('mock_pkce_code_abcdef');
  });

  it('identifies OAuth error redirect correctly', () => {
    const callbackUrl = 'khidmat://auth/callback?error=user_cancelled&error_description=User+cancelled+flow';
    const parsed = parseAuthRedirectUrl(callbackUrl);
    expect(parsed.type).toBe('error');
    expect(parsed.error).toBe('user_cancelled');
    expect(parsed.errorDescription).toBe('User cancelled flow');
  });

  it('handles custom scheme with fragment tokens', () => {
    const callbackUrl = 'khidmat://auth/callback#access_token=token_xyz&refresh_token=refresh_123';
    const parsed = parseAuthRedirectUrl(callbackUrl);
    expect(parsed.type).toBe('token');
    expect(parsed.accessToken).toBe('token_xyz');
    expect(parsed.refreshToken).toBe('refresh_123');
  });
});
