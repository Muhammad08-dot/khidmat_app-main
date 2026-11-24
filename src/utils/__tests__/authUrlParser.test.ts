import { parseAuthRedirectUrl } from '../authUrlParser';

describe('parseAuthRedirectUrl', () => {
  it('parses PKCE code flow query parameters correctly', () => {
    const url = 'khidmat://auth/callback?code=test-auth-code-12345';
    const result = parseAuthRedirectUrl(url);

    expect(result.type).toBe('code');
    expect(result.code).toBe('test-auth-code-12345');
    expect(result.error).toBeUndefined();
  });

  it('parses implicit/fragment tokens correctly', () => {
    const url = 'khidmat://auth/callback#access_token=eyJhbGciOi...&refresh_token=ref-token-789&token_type=bearer';
    const result = parseAuthRedirectUrl(url);

    expect(result.type).toBe('token');
    expect(result.accessToken).toBe('eyJhbGciOi...');
    expect(result.refreshToken).toBe('ref-token-789');
  });

  it('parses error query parameters with decoded description', () => {
    const url = 'khidmat://auth/callback?error=access_denied&error_description=The+user+denied+any+permissions';
    const result = parseAuthRedirectUrl(url);

    expect(result.type).toBe('error');
    expect(result.error).toBe('access_denied');
    expect(result.errorDescription).toBe('The user denied any permissions');
  });

  it('parses error in fragment parameter', () => {
    const url = 'khidmat://auth/callback#error=unauthorized_client&error_description=Client+is+not+allowed';
    const result = parseAuthRedirectUrl(url);

    expect(result.type).toBe('error');
    expect(result.error).toBe('unauthorized_client');
    expect(result.errorDescription).toBe('Client is not allowed');
  });

  it('returns empty for null, undefined, or empty string input', () => {
    expect(parseAuthRedirectUrl(null).type).toBe('empty');
    expect(parseAuthRedirectUrl(undefined).type).toBe('empty');
    expect(parseAuthRedirectUrl('').type).toBe('empty');
    expect(parseAuthRedirectUrl('   ').type).toBe('empty');
  });

  it('returns empty for a URL without auth parameters', () => {
    const url = 'khidmat://auth/callback';
    const result = parseAuthRedirectUrl(url);
    expect(result.type).toBe('empty');
  });
});

