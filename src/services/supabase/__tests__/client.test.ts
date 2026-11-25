import {
  getSupabaseClient,
  ConfigError,
  isConfigured,
  createConfigErrorProxy,
  USE_MOCK,
  DEMO_MODE,
} from '../client';

describe('Supabase Client Configuration & Mock-fallback Removal (P3-1)', () => {
  it('returns mock client when mock is explicitly enabled', () => {
    const client = getSupabaseClient('', '', true);
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('production config without URL or key throws ConfigError and NEVER returns mock', () => {
    const unconfiguredClient = getSupabaseClient('', '', false);
    expect(unconfiguredClient).toBeDefined();

    expect(() => {
      unconfiguredClient.from('profiles');
    }).toThrow(ConfigError);

    expect(() => {
      unconfiguredClient.auth.getSession();
    }).toThrow(ConfigError);

    expect(() => {
      unconfiguredClient.channel('test');
    }).toThrow(ConfigError);
  });

  it('createConfigErrorProxy returns undefined for .then so awaiting does not throw synchronously', async () => {
    const proxy = createConfigErrorProxy() as unknown as { then?: unknown };
    expect(proxy.then).toBeUndefined();
    const resolved = await Promise.resolve(proxy);
    expect(resolved).toBe(proxy);
  });

  it('createConfigErrorProxy throws ConfigError when invoked as a function', () => {
    const fnProxy = createConfigErrorProxy() as unknown as () => void;
    expect(() => fnProxy()).toThrow(ConfigError);
  });

  it('throws ConfigError when only URL is provided without anon key', () => {
    const partialClient = getSupabaseClient('https://example.supabase.co', '', false);
    expect(() => partialClient.from('profiles')).toThrow(ConfigError);
  });

  it('throws ConfigError when only anon key is provided without URL', () => {
    const partialClient = getSupabaseClient('', 'anon-key-value', false);
    expect(() => partialClient.from('profiles')).toThrow(ConfigError);
  });

  it('creates a real SupabaseClient when valid URL and anon key are provided', () => {
    const realClient = getSupabaseClient('https://example.supabase.co', 'anon-key-value', false);
    expect(realClient).toBeDefined();
    expect(typeof realClient.from).toBe('function');
    expect(realClient.auth).toBeDefined();
  });

  it('exports boolean flags isConfigured, USE_MOCK, and DEMO_MODE consistently', () => {
    expect(typeof isConfigured).toBe('boolean');
    expect(typeof USE_MOCK).toBe('boolean');
    expect(DEMO_MODE).toBe(USE_MOCK);
  });

  it('ConfigError has the correct name and error message', () => {
    const err = new ConfigError();
    expect(err.name).toBe('ConfigError');
    expect(err.message).toContain('Configuration error');
  });
});
