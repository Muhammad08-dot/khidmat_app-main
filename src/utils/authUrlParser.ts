/**
 * Utility to parse OAuth redirect URLs from Supabase/Google authentication.
 * Supports both PKCE (code query param) and Implicit/Fragment (hash tokens) flows.
 */

export interface ParsedAuthUrl {
  type: 'code' | 'token' | 'error' | 'empty';
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
}

export function parseAuthRedirectUrl(url: string | null | undefined): ParsedAuthUrl {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { type: 'empty' };
  }

  try {
    // Check for fragment/hash parameters first (#access_token=...&refresh_token=...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const fragment = url.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        return {
          type: 'error',
          error,
          errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : undefined,
        };
      }

      if (accessToken && refreshToken) {
        return {
          type: 'token',
          accessToken,
          refreshToken,
        };
      }
    }

    // Check query parameters (?code=... or ?error=...)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1).split('#')[0];
      const params = new URLSearchParams(queryString);

      const error = params.get('error');
      const errorDescription = params.get('error_description');
      if (error) {
        return {
          type: 'error',
          error,
          errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : undefined,
        };
      }

      const code = params.get('code');
      if (code) {
        return {
          type: 'code',
          code,
        };
      }
    }

    return { type: 'empty' };
  } catch {
    return { type: 'error', error: 'invalid_url', errorDescription: 'Malformed redirect URL' };
  }
}

