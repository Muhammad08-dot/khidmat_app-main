import { getSupabaseClient, ConfigError, isConfigured } from '../client';

describe('Supabase Client Configuration & Mock-fallback Removal (P3-1)', () => {
  it('returns mock client when mock is explicitly enabled', () => {
    const client = getSupabaseClient('', '', true);
    expect(client).toBeDefined();
    // Mock client has local session methods and doesn't throw ConfigError
    expect(typeof client.from).toBe('function');
  });

  it('production config without URL or key throws ConfigError and NEVER returns mock', () => {
    // Force mock to false and provide empty credentials
    const unconfiguredClient = getSupabaseClient('', '', false);
    expect(unconfiguredClient).toBeDefined();

    // Accessing any property or method must throw ConfigError
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

  it('ConfigError has the correct name and error message', () => {
    const err = new ConfigError();
    expect(err.name).toBe('ConfigError');
    expect(err.message).toContain('Configuration error');
  });
});

