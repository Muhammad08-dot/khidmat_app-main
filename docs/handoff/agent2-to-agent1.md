# Handoff from Agent 2 (Hardening) to Agent 1 (UI)

## Task P3-1: ErrorBoundary Configuration Error Display
- **File:** `src/components/layout/ErrorBoundary.tsx`
- **Change:** When catching a `ConfigError` or an error with message containing "Configuration error", display a dedicated "Configuration error" headline with a "Retry" button.
- **Reason:** P3-1 Mock-fallback removal requires an explicit configuration error screen when Supabase credentials are missing in production instead of silently falling back to mock. Agent 1 owns UI styling in `src/components/**`.

## Part B: Root package.json Script for Integration Tests
- **File:** `package.json`
- **Change:** Add `"test:integration": "jest --config jest.integration.config.js"` to `"scripts"`.
- **Reason:** Enables developers to execute cloud integration tests from the repository root via `npm run test:integration`. Agent 1 owns the root `package.json`.
