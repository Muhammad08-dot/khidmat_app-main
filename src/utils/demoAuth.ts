/**
 * Determines whether the 1-Tap Demo Login button should be rendered.
 * (PRD v2: REP-01 / P1-4 Gating)
 *
 * It is only visible during active development (__DEV__ === true) or when
 * explicitly enabled for testing environments via EXPO_PUBLIC_ENABLE_DEMO=true.
 * In production releases, it is strictly disabled by default.
 */
export function isDemoLoginEnabled(
  isDev: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : false,
  enableDemoEnv: string | undefined = process.env.EXPO_PUBLIC_ENABLE_DEMO
): boolean {
  if (enableDemoEnv === 'true') return true;
  if (enableDemoEnv === 'false') return false;
  return isDev;
}
