import { storage } from "@/src/utils/storage";

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

const STORE_KEY = "khidmat_crash_log";
const MAX_STORED = 25;

const getEnv = (key: string): string => (process.env as any)[key] || "";
const AGENT_ENDPOINT = getEnv("EXPO_PUBLIC_AGENT_ENDPOINT");

export async function captureError(
  error: Error | null,
  componentStack?: string
): Promise<void> {
  const entry: ReportableError = {
    message: error?.message || String(error),
    stack: error?.stack,
    componentStack,
    platform: "react-native",
    timestamp: new Date().toISOString(),
  };
  console.error("[agent] captured error:", entry.message);

  await persistError(entry);
  if (AGENT_ENDPOINT) {
    await sendToAgent(entry).catch((e) =>
      console.warn("[agent] failed to forward error:", e)
    );
  }
}

async function persistError(entry: ReportableError): Promise<void> {
  try {
    const raw = await storage.getItem(STORE_KEY);
    const log: ReportableError[] = raw ? JSON.parse(raw) : [];
    log.unshift(entry);
    await storage.setItem(STORE_KEY, JSON.stringify(log.slice(0, MAX_STORED)));
  } catch (e) {
    console.warn("[agent] persistError failed:", e);
  }
}

async function sendToAgent(entry: ReportableError): Promise<void> {
  const res = await fetch(AGENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...entry, appVersion: getEnv("EXPO_PUBLIC_APP_VERSION") }),
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
