import { isDemoLoginEnabled } from '../demoAuth';

describe('demoAuth gating (P1-4 / REP-01)', () => {
  it('disables demo login in production when EXPO_PUBLIC_ENABLE_DEMO is unset', () => {
    const isDev = false;
    const envFlag = undefined;
    expect(isDemoLoginEnabled(isDev, envFlag)).toBe(false);
  });

  it('disables demo login when EXPO_PUBLIC_ENABLE_DEMO is explicitly "false"', () => {
    expect(isDemoLoginEnabled(false, 'false')).toBe(false);
    expect(isDemoLoginEnabled(true, 'false')).toBe(false);
  });

  it('enables demo login in development (__DEV__ = true) when flag is unset', () => {
    expect(isDemoLoginEnabled(true, undefined)).toBe(true);
  });

  it('enables demo login when EXPO_PUBLIC_ENABLE_DEMO is explicitly "true" even if __DEV__ is false', () => {
    expect(isDemoLoginEnabled(false, 'true')).toBe(true);
  });
});
