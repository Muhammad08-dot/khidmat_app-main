import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client-side crash reporter for the "self-healing" agent.
 *
 * Because Expo Go cannot run Sentry's native module, crashes are captured:
 *  1. locally (persisted, newest first) so they survive restarts, and
 *  2. POSTed to the agent microservice (`EXPO_PUBLIC_AGENT_ENDPOINT`) when
 *     configured, so the LLM can ingest the stack trace and propose a fix.
 *
 * Once the app moves to a development build, swap this for
 * `@sentry/react-native` and keep `reportError` as the forwarder to the agent.
 */

export interface ReportableError {
  message: string;
  stack?: string;
  componentStack?: string;
  appVersion?: string;
  platform: string;
  timestamp: string;
}

const STORE_KEY = 'khidmat_crash_log';
const MAX_STORED = 25;

const getEnv = (key: string): string => (process.env as any)[key] || '';
const AGENT_ENDPOINT = getEnv('EXPO_PUBLIC_AGENT_ENDPOINT');

/**
 * Strips Personally Identifiable Information (PII) including CNIC, phone numbers,
 * auth tokens, emails, and address snippets from error logs before transmitting.
 */
export function scrubPII(text: string | undefined): string {
  if (!text) return '';
  let clean = text;

  // 1. Redact JWT / Bearer tokens
  clean = clean.replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_TOKEN]');

  // 2. Redact Pakistani CNIC (with or without dashes: 35202-1234567-1 or 3520212345671)
  clean = clean.replace(/\b\d{5}-\d{7}-\d{1}\b/g, '[REDACTED_CNIC]');
  clean = clean.replace(/\b[1-7]\d{12}\b/g, '[REDACTED_CNIC]');

  // 3. Redact Pakistani Mobile Numbers (+923001234567, 0300-1234567, 03211234567)
  clean = clean.replace(/(?:\+92|0)?3[0-9]{2}[- ]?[0-9]{7}\b/g, '[REDACTED_PHONE]');

  // 4. Redact Email addresses
  clean = clean.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');

  // 5. Redact street / house address indicators
  clean = clean.replace(
    /\b(House|Flat|Plot|Apartment|Office|Street|Road|Phase|Block)\s+[\w\d\s,-]+/gi,
    (match) => {
      // Only redact if contains digits or specific address identifiers
      if (/\d/.test(match)) return '[REDACTED_ADDRESS]';
      return match;
    }
  );

  return clean;
}

export async function captureError(error: Error | null, componentStack?: string): Promise<void> {
  const rawMessage = error?.message || String(error);
  const entry: ReportableError = {
    message: scrubPII(rawMessage),
    stack: scrubPII(error?.stack),
    componentStack: scrubPII(componentStack),
    platform: 'react-native',
    timestamp: new Date().toISOString(),
  };
  console.error('[agent] captured error:', entry.message);

  await persistError(entry);
  if (AGENT_ENDPOINT) {
    await sendToAgent(entry).catch((e) => console.warn('[agent] failed to forward error:', e));
  }
}

async function persistError(entry: ReportableError): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const log: ReportableError[] = raw ? JSON.parse(raw) : [];
    log.unshift(entry);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(log.slice(0, MAX_STORED)));
  } catch (e) {
    console.warn('[agent] persistError failed:', e);
  }
}

async function sendToAgent(entry: ReportableError): Promise<void> {
  const res = await fetch(AGENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...entry, appVersion: getEnv('EXPO_PUBLIC_APP_VERSION') }),
  });
  if (!res.ok) throw new Error(`agent endpoint ${res.status}`);
}

/** Install a global handler for uncaught JS errors (Expo/RN). */
export function installGlobalErrorHandler(): void {
  // React Native surfaces unhandled errors through ErrorUtils
  const g = globalThis as any;
  const ErrorUtils = g.ErrorUtils;
  if (ErrorUtils && !g.__khidmatErrorHandlerInstalled) {
    const original = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
      void captureError(e instanceof Error ? e : new Error(String(e)));
      if (original) original(e, isFatal);
    });
    g.__khidmatErrorHandlerInstalled = true;
  }
}
