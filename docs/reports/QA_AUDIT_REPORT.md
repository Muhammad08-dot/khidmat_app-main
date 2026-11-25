# Khidmat v2 — Comprehensive QA & Code Audit Report

**Branch:** `feat/prd-v2-hardening`  
**Date:** 2026-11-25  
**Scope:** Phases 0–4 executed against local codebase, Expo SDK 58 Web/Android bundles, Jest suite, and Playwright + Axe (Demo Mode). Live cloud TEST database phases remain **BLOCKED** pending separate `khidmat-test` credentials in `.env.test` / `.env.app.test` (Hard Rule 1 refused using `.env`'s project URL).

---

## 1. Executive Summary
- **Verdict:** **READY FOR DEMO (Offline / Demo Mode): YES** · **READY FOR PRODUCTION: NO** (live TEST Supabase migrations, integration suite, smoke test, `delete-account` edge function, and Provider KYC upload UI are still pending).
- **Automated Pass-Rate:**
  - Static (`tsc --noEmit`, `eslint`, `secret-scan`, `expo-doctor`): **4/4 PASS (100%)**
  - Unit & Pure Logic (`npx jest`): **28/28 suites, 144/144 tests PASS (100%)**
  - Bundle Exports (`expo export` Android & Web): **2/2 PASS (100%)**
  - Web E2E + Axe (Playwright Demo Mode): **2/2 PASS** (captured 7 screenshots; identified 2 Axe accessibility rules and 1 missing `testID`)
  - Live TEST Supabase Integration / Smoke: **BLOCKED** (missing separate `khidmat-test` `.env.test` / `.env.app.test`)
- **Counts by Severity:** `S0: 0` (LinkingContext crash fixed in `d5f654b` / `7c082c8`) · `S1: 2` · `S2: 5` · `S3: 3`
- **Top 10 Risks:**
  1. **S1:** Live TEST Supabase DB (`khidmat-test`) not provisioned/verified yet (`test-integration.js`, `smoke-test.js`, `0013–0017` push blocked).
  2. **S1:** Provider KYC document upload UI (CNIC front/back) does not exist yet (deferred until after GATE-A).
  3. **S2:** `agent-server/src/app.ts:142` interpolates `req.body.model` directly into Gemini URL path without allowlist/regex validation.
  4. **S2:** `AuthContext.tsx:114` `getSession().then(...)` has no `.catch(...)` handler and `fetchProfile` can run twice on startup (`getSession` + `onAuthStateChange`).
  5. **S2:** `CustomerHome.tsx` is missing documented `testID`s (`home-greeting`, `home-search-input`) listed in `docs/ui/TESTIDS.md`.
  6. **S2:** Axe accessibility audit flagged `color-contrast` (serious) and `region` (moderate) on Auth and Customer Home web views.
  7. **S2:** `agent-server/src/app.ts` uses `express-rate-limit` without `app.set('trust proxy', 1)` for reverse-proxy deployments.
  8. **S3:** `npm audit --omit=dev` has 3 remaining moderate CLI advisories (`minimatch` in `@expo/fingerprint`; patching requires breaking downgrade to Expo 52).
  9. **S3:** 3 non-`SECURITY DEFINER` trigger functions in `0014_rls_hardening.sql` omit explicit `SET search_path = public`.
  10. **S3:** 376 ESLint warnings remain (mostly Prettier formatting + unused imports, 0 errors).

---

## 2. Environment and Method
- **Node / npm / Supabase CLI:** `node -v`, `npm -v`, `npx supabase --version` recorded in `docs/reports/qa-logs/phase0.txt`.
- **Expo SDK:** `expo@58.0.26`, `react-native@0.88.1`, `nativewind@4.2.7`, `react-native-css-interop@0.2.7` (exact).
- **TEST Project Ref:** **BLOCKED** — `.env.test` / `.env.app.test` do not have separate `khidmat-test` credentials (Hard Rule 1 strictly prevented using `.env` URL `sodxwch...`).
- **What Web Testing Cannot Cover (`NOT-TESTABLE-HERE`):** Native `Linking.openURL('tel:15')` / `'tel:1122'`, `expo-location` background tracking, `expo-notifications` remote push tokens, native `expo-image-picker` camera capture, `react-native-maps` native view, and `khidmat://` deep-link cold starts.

---

## 3. Commands Executed

| Command | Purpose | Exit Code | Result | Log File |
| :--- | :--- | :---: | :--- | :--- |
| `npx tsc --noEmit` | Static TypeScript check | `0` | **PASS** (0 errors) | `docs/reports/qa-logs/phase0-tsc.txt` |
| `npm run lint` | ESLint across repo | `0` | **PASS** (0 errors, 376 warnings) | `docs/reports/qa-logs/phase0-lint.txt` |
| `npx jest --coverage` | Unit + coverage baseline | `0` | **PASS** (26/26, 137 tests) | `docs/reports/qa-logs/phase0-jest.txt` |
| `npx jest qa-i18n-parity + qa-logic` | Phase 3 parity & logic | `0` | **PASS** (2/2, 7 tests) | `docs/reports/qa-logs/phase3.txt` |
| `npx expo-doctor` | Expo SDK 58 health check | `0` | **PASS** (20/20 checks) | `docs/reports/qa-logs/phase0-doctor.txt` |
| `node scripts/secret-scan.js` | Secret leak scan | `0` | **PASS** (211 files) | `docs/reports/qa-logs/phase0.txt` |
| `npm audit --omit=dev` | Prod dependency audit | `1` | **3 moderate** (0 crit/high) | `docs/reports/qa-logs/phase0.txt` |
| `npx --yes depcheck` | Unused dependency check | `1` | **6 unused flagged** | `docs/reports/qa-logs/phase0-depcheck.txt` |
| `agent-server` `typecheck && test` | Backend AI server checks | `0` | **PASS** | `docs/reports/qa-logs/phase0.txt` |
| `npx expo export --platform android` | Android bundle build | `0` | **PASS** | `docs/reports/qa-logs/phase0-export-android.txt` |
| `npx expo export --platform web` | Web bundle build | `0` | **PASS** | `docs/reports/qa-logs/phase0-export-web.txt` |
| `npx playwright test` | Web E2E + Axe (Demo) | `0` | **PASS** (2/2, 7 PNGs) | `docs/reports/qa-logs/phase2-playwright.txt` |
| `node scripts/use-env.js test` | Switch to TEST env | `1` | **BLOCKED** (placeholder env) | `FINAL_REPORT.md` |
| `node scripts/test-integration.js` | Real DB integration | `-` | **BLOCKED** (no TEST DB) | `N/A` |
| `node scripts/smoke-test.js` | Real DB E2E smoke | `-` | **BLOCKED** (no TEST DB) | `N/A` |

---

## 4. Feature Matrix Results
- Full auto-generated & reconciled matrix: [FEATURE_MATRIX.md](file:///D:/dev-stuff/khidmat_app-main/docs/qa/FEATURE_MATRIX.md)
- **Reconciliation:** **187 `onPress` handlers found, 187 handler rows in matrix** across **25 route files** in `app/`.

---

## 5. WORKING Features (With Evidence)
- **Auth Login, Signup Wizard & Segment Toggle:** Verified via Playwright (`01-auth-login.png`, `02-auth-signup-provider.png`, `phase2-playwright.txt`) and Jest (`demoChecklist.test.ts`).
- **Demo Login Production Gating (`REP-01`):** Verified `auth-demo-button` is absent in production web bundle (`expo export`) and active in dev mode (`demoAuth.test.ts`).
- **Customer Home, Categories, Providers, Legal Pages & Admin Guard:** Rendered cleanly on Web E2E (`03-customer-home.png` .. `07-admin-guard.png`) with 0 `pageerror` exceptions.
- **i18n EN / UR Key Parity & RTL Logic:** Verified 100% key parity between `en.json` and `ur.json` with 0 missing static `t(...)` keys (`qa-i18n-parity.test.ts`, `phase3.txt`).
- **Pure Logic (Travel Fee, Haversine, CNIC/Phone Masking, Auth Redirect Parser, Ratings):** Verified via `qa-logic.test.ts` (`phase3.txt`) and existing unit suites (`phase0-jest.txt`).
- **11-Category Demo Mode Flow (Mock Client):** Email signup, profile update, booking, provider confirm/start/complete, job photo signed URL, chat, notifications, logout/login, and account deletion verified end-to-end against `mockClient.ts` (`demoChecklist.test.ts`).

---

## 6. NOT WORKING / Broken (Bug List)

| ID | Severity | Title | Steps to Reproduce | Expected vs Actual | Evidence | Root Cause (`file:line`) | Proposed Fix | Effort |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **BUG-QA-01** | **S1** | Real TEST DB verification blocked | Run `node scripts/use-env.js test` | Connects to `khidmat-test` vs Blocked on placeholder `.env.test` | `FINAL_REPORT.md` | `.env.test:1` (placeholder) | Create separate `khidmat-test` project and populate `.env.test` + `.env.app.test` | S |
| **BUG-QA-02** | **S2** | `CustomerHome` missing documented `testID`s | Query `[data-testid="home-greeting"]` on Home | `home-greeting` & `home-search-input` present vs missing (`false`) | `phase2-playwright.txt` | `src/components/features/CustomerHome.tsx` | Add `testID="home-greeting"` and `testID="home-search-input"` per `TESTIDS.md` | S |
| **BUG-QA-03** | **S2** | Axe accessibility violations on Auth & Home | Run `@axe-core/playwright` on `/` and Home | 0 violations vs 2 (`color-contrast` serious, `region` moderate) | `phase2-playwright.txt` | `app/(auth)/auth.tsx`, `CustomerHome.tsx` | Darken muted text tokens (`>= 4.5:1`) and wrap main content in `<main>`/`role="main"` on web | S |
| **BUG-QA-04** | **S2** | Unvalidated `model` path param in Gemini proxy | POST `/api/gemini/generateContent` with `model: "../x"` | Allowlisted model name vs raw string interpolated into URL | `agent-server/src/app.ts:142` | `agent-server/src/app.ts:47,142` | Validate `model: z.string().regex(/^[a-zA-Z0-9._-]+$/)` | S |
| **BUG-QA-05** | **S2** | Unhandled rejection & double fetch in `AuthProvider` | Mount `AuthProvider` when storage throws | Caught cleanly & single fetch vs missing `.catch()` on `getSession()` | `AuthContext.tsx:114` | `src/context/AuthContext.tsx:114-136` | Add `.catch(() => setLoading(false))` and deduplicate initial `fetchProfile` | S |
| **BUG-QA-06** | **S2** | `rateLimit` missing `trust proxy` on `agent-server` | Deploy behind reverse proxy | Per-client IP limiting vs shared proxy IP | `agent-server/src/app.ts:75` | `agent-server/src/app.ts:63-75` | Add `app.set('trust proxy', 1)` when `NODE_ENV === 'production'` | S |
| **BUG-QA-07** | **S3** | Non-`SECURITY DEFINER` triggers omit `search_path` | Inspect `0014_rls_hardening.sql` | Explicit `SET search_path = public` vs omitted on 3 triggers | `0014_rls_hardening.sql:47,80,126` | `supabase/migrations/0014_rls_hardening.sql` | Add `SET search_path = public` in next migration if desired | S |
| **BUG-QA-08** | **S3** | 376 ESLint/Prettier warnings | Run `npm run lint` | Clean lint vs 376 warnings | `phase0-lint.txt` | Multiple `src/` and `app/` files | Run targeted prettier formatting after GATE-A | S |
| **BUG-QA-09** | **S3** | `depcheck` reports 6 unused direct deps | Run `npx depcheck` | Clean deps vs 6 flagged (`expo-localization`, `react-native-maps`, etc.) | `phase0-depcheck.txt` | `package.json` | Audit dynamic/config-plugin usage before removing any | S |

---

## 7. MISSING Features / Gaps to Add
1. **Provider KYC Upload UI (Priority: S1, Deferred per PRD until after GATE-A):**
   - *Acceptance Criteria:* Provider can pick CNIC front/back images via `expo-image-picker`, upload to `kyc-documents/{userId}/...` via `uploadKycDocument()`, and see pending/approved status on `ProviderHome`.
2. **TestID Alignment (`docs/ui/TESTIDS.md`):**
   - *Acceptance Criteria:* All selectors in `TESTIDS.md` (`home-greeting`, `home-search-input`, etc.) exist on rendered components.

---

## 8. Code Review Findings (Phase 4)

| Path | LOC | Reviewed | Findings |
| :--- | :---: | :---: | :--- |
| `supabase/migrations/0014_rls_hardening.sql` | 239 | YES | Solid RLS & triggers; 3 non-SD triggers lack `SET search_path = public` |
| `supabase/migrations/0015_fix_booking_state_machine.sql` | 63 | YES | Role clamped to `customer`/`provider`, `FOR EACH ROW` verified |
| `supabase/migrations/0016_job_media_booking_rls.sql` | 23 | YES | Clean booking-party SELECT policy |
| `supabase/migrations/0017_job_media_provider_upload.sql` | 38 | YES | Clean booking-provider INSERT/DELETE policy |
| `src/services/supabase/client.ts` | 137 | YES | Clean `sessionStorage` on web, `SecureStore` on native, `ConfigError` proxy |
| `src/services/supabase/kyc.ts` | 117 | YES | Clean signed URL (900s) & filename sanitization |
| `src/services/supabase/accountDeletion.ts` | 107 | YES | Clean storage purge + RPC + JWT edge function |
| `src/services/supabase/queries.ts` | 531 | PARTIAL (1-160) | Unused `Database` import (`L2`), mid-file `import` (`L117`) |
| `src/context/AuthContext.tsx` | 367 | PARTIAL (1-270) | `userProfile: any`, missing `.catch()` on `getSession()` (`L114`) |
| `agent-server/src/app.ts` | 239 | YES (1-150) | `model` URL interpolation (`L142`), missing `trust proxy` (`L63`) |
| `agent-server/src/middleware/auth.ts` | 37 | YES | Clean `jwt.verify` with audience check |
| Remaining `app/`, `src/components/`, `scripts/` | - | NOT REVIEWED (covered via Jest + Playwright + lint/tsc) | Marked explicitly per Phase 4 triage rule |

---

## 9. Security Findings (With Proof)
- **Secret Scan (`scripts/secret-scan.js`):** **PASS** (211 tracked files, 0 private keys or service-role JWTs).
- **NPM Production Audit (`npm audit --omit=dev`):** **0 critical, 0 high**, 3 moderate (`minimatch` in `@expo/fingerprint` CLI; build-time only).
- **Static RLS & Edge Function Proof:** `0014`–`0017` enforce role escalation lock, price lock, immutable `admin_actions`, and `job_media` counterparty RLS. **Live DB exploit proof (`E.23`):** **BLOCKED** pending `khidmat-test` credentials.

---

## 10. i18n / RTL / Accessibility / Performance Findings
- **i18n Parity (`qa-i18n-parity.test.ts`):** **PASS** — `en.json` and `ur.json` match 100%, 0 missing static `t(...)` keys.
- **RTL Layout Tests (`authDirection.test.ts`, `screens.test.tsx`):** **PASS** — real rendered `writingDirection` / `textAlign` assertions verified.
- **Accessibility (Axe):** **2 violations** on Auth & Customer Home (`color-contrast` serious, `region` moderate).

---

## 11. Test Coverage Numbers (Per Folder — `docs/reports/qa-logs/phase0-jest.txt`)
- `src/theme`: **77.77%** stmts (`colors.ts` & `tokens.ts` 100%, `fonts.ts` 0%)
- `src/utils`: **71.09%** stmts (`ratings.ts` & `demoAuth.ts` 100%, `eventEmitter.ts` & `geolocation.ts` 0%)
- `src/services/supabase`: **48.96%** stmts (`mappers.ts` 85.71%, `kyc.ts` 83.87%, `accountDeletion.ts` 83.33%, `legacy.ts` 14%)
- `src/services/api`: **14.46%** stmts (`errorReporter.ts` 62.79%, `agentClient.ts` 4.16%, `agentLogService.ts` 0%)
- `src/types`: **0%** (type definitions)

---

## 12. REMAINING WORK PLAN
1. **[Must Fix Before Live QA / Prod]:** Provision separate `khidmat-test` Supabase project, fill `.env.test` & `.env.app.test`, run `supabase db push` (`0001–0017`), `test-integration.js`, `smoke-test.js`, and deploy `delete-account`.
2. **[Must Fix After GATE-A]:** Build Provider KYC Upload UI (CNIC front/back).
3. **[Should Fix]:** Add missing `testID`s in `CustomerHome.tsx`, fix Axe `color-contrast` & `region` violations, validate `model` regex in `agent-server/src/app.ts`, add `.catch()` on `getSession()`.
4. **Manual Device Checklist (Expo Go on `http://localhost:8081`):**
   - Native maps, background location, remote push notifications (expected Expo Go StoreClient limit → needs EAS Dev Build), camera/image picker, `khidmat://` deep links, Google OAuth, and all 11 core flows.

---

## 13. Appendix
- **File Inventory:** `docs/reports/qa-logs/phase1.txt` (187 `onPress` handlers, 25 routes).
- **DB Sanity:** **BLOCKED** (no separate `khidmat-test` credentials).
- **Screenshots (`docs/qa/screens/`):** `01-auth-login.png`, `02-auth-signup-provider.png`, `03-customer-home.png`, `04-categories.png`, `05-providers.png`, `06-privacy.png`, `07-admin-guard.png`.
- **QA Cleanup:** No real cloud QA users created (Demo Mode in-memory only).
