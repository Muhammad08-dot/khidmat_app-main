# Khidmat v2 — Final Execution & Verification Report

**Executor:** Agent 2 (Single Agent)  
**Worktree:** `D:\dev-stuff\khidmat-hardening`  
**Branch:** `feat/prd-v2-hardening`  
**Updated:** 2026-11-24  

---

## 1. Milestone Status Table (M0 – M4 / GATE-A)

| Task ID | Description | Status | Notes / Evidence |
| :--- | :--- | :---: | :--- |
| M0-1 | Check worktrees, snapshot `feat/prd-v2-ui` (`96399aa`) | **PASS** | Clean snapshot on `feat/prd-v2-ui` |
| M0-2 | Merge `feat/prd-v2-ui` into `feat/prd-v2-hardening` | **PASS** | 0 conflicts, 18 files merged |
| M0-3 | Baseline gate run (`tsc`, `lint`, `jest`, `expo-doctor`, `secret-scan`, `agent-server`) | **PASS** | All green |
| M0-4 | Create `FINAL_REPORT.md` & `DASHBOARD_CHANGELOG.md`, update `.gitignore` | **PASS** | `git check-ignore` verified for all 4 env files |
| M1-1..M1-7 | Create `khidmat-test` Supabase project, `.env.test`, `db push`, auth/OAuth via Firefox MCP | **BLOCKED** | Firefox MCP is not connected in this session; requires owner dashboard access & `.env.test` |
| M2-1 | Booking state machine trigger & role rules (`0015_fix_booking_state_machine.sql`) | **PASS (SQL)** | `FOR EACH ROW` + role rules; awaiting live DB push |
| M2-2 | Prevent admin via signup (`handle_new_user` role clamp in `0015`) | **PASS (SQL)** | Clamps metadata role strictly to `customer` \| `provider` |
| M2-3 | `admin_actions` consistency (`database.types.ts` + `docs/SECURITY.md`) | **PASS** | Nullable `actor_id`, FK tradeoff documented |
| M2-4 | Account deletion hardening (`delete-account` Edge Fn + `accountDeletion.ts`) | **PASS (Code)** | JWT-derived user, idempotent, `job_media` by `bookingId`; deploy blocked on M1 |
| M2-5 | Run live integration suite (`node scripts/test-integration.js`) | **BLOCKED** | `NOT RUN / SKIPPED` (requires `.env.test` from M1) |
| M2-6 | Add integration cases (`RLS-05..07`, `SM-04`, `DEL-02`) | **PASS (Code)** | Committed (`e49bfaa`) |
| M2-7 | `supabase gen types typescript --project-id <test-ref>` | **BLOCKED** | Requires `<test-ref>` & `SUPABASE_ACCESS_TOKEN` from M1 |
| M3-1 | Autofill (`importantForAutofill="no"` / `autoComplete="off"` removed) | **PASS** | Verified via `git grep` |
| M3-2 | SOS (`15` & `1122` via `Linking.openURL` in `try/catch`) + `ErrorBoundary` (no Retry on `ConfigError`) | **PASS** | Committed (`97726d6`), unit tests passing |
| M3-3 | Remaining screens RTL + EN/UR + error/empty states | **PASS** | `privacy`, `terms`, `safety`, `categories`, `admin`, `provider/[id]`, `bookings` updated |
| M3-4 | Private buckets: `createSignedKycUrl`, `maskCnic()`, `job_media` signed URLs | **PASS** | `legacy.ts` + `admin.tsx` updated |
| M3-5 | Profile Delete Account wired to `deleteUserAccountFlow` + `logout` | **PASS** | Committed (`3670ecd`) |
| M3-6 | Typed errors mapped to EN/UR `errors_*` keys (`getLocalizedError`) | **PASS** | Unit tests passing |
| M3-7 | OAuth redirect (`makeRedirectUri`, `window.location.origin`, `detectSessionInUrl` on web) | **PASS** | Committed (`cb7e5f7`) |
| M3-8 | Remove hardcoded Dubai landmark / amber "Map API offline" banner | **PASS** | Verified via `git grep` |
| M3-9 | Providers, Bookings, Admin render tests + expanded `collectCoverageFrom` | **PASS** | `screens.test.tsx` + `jest.config.js` |
| M3-10 | Final gate run (`tsc`, `lint`, `jest`, `expo-doctor`, `secret-scan`) | **PASS** | 0 TS errors, 0 lint errors, 25/25 Jest suites |
| M4-1 | Expo Go compatibility audit & path decision (`docs/EXPO_RUN.md`) | **PASS** | SDK 57 + `@maplibre/maplibre-react-native` → Dev Build for maps, Expo Go for JS smoke |
| M4-2 | Guard background location & remote push in Expo Go (`ExecutionEnvironment.StoreClient`) | **PASS** | Committed (`7540730`) |
| M4-3 | Env switcher `scripts/use-env.js test\|prod` | **PASS** | Committed (`7f05dcb`) |
| M4-4 | Android bundle smoke export (`npx expo export --platform android`) | **PASS** | 4319 modules bundled (`EXPORT_EXIT:0`), `.tmp-export` deleted |
| M4-5 | Live Web QA against `khidmat-test` via Firefox MCP | **BLOCKED** | Blocked on M1 (`khidmat-test`) & Firefox MCP |
| M4-6 | Start Metro (`npx expo start -c`) against `khidmat-test` | **BLOCKED** | Blocked on M1 (`.env.app.test` / `.env.local` for `khidmat-test`) |
| M5 | Production deployment (`GO PROD` -> GATE-B) | **PENDING** | Awaits GATE-A + owner `GO PROD` |

---

## 2. Exact Owner Actions Required to Unblock M1 / M2-5 / M4-5 / M4-6

1. **Create `khidmat-test` in Supabase Dashboard** (free project, region nearest to Pakistan). Generate a strong DB password.
2. **Create `.env.test`** (gitignored) with:
   - `SUPABASE_TEST_URL`
   - `SUPABASE_TEST_ANON_KEY`
   - `SUPABASE_TEST_SERVICE_ROLE_KEY`
   - `SUPABASE_TEST_CONFIRM=yes`
   - `SUPABASE_TEST_DB_PASSWORD`
3. **Create `.env.app.test`** (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for `khidmat-test`, then run:
   ```powershell
   node scripts/use-env.js test
   ```
4. **Push migrations & deploy `delete-account` Edge Function to `khidmat-test`:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "<your-personal-access-token>"
   $env:SUPABASE_DB_PASSWORD = "<your-test-db-password>"
   npx supabase link --project-ref <test-ref>
   npx supabase db push
   npx supabase functions deploy delete-account --use-api
   ```
5. **Run live integration tests:**
   ```powershell
   node scripts/test-integration.js
   ```
6. **Configure Auth on `khidmat-test` Dashboard:**
   - Site URL: `khidmat://auth/callback`
   - Redirect URLs: `khidmat://**`, `khidmat://auth/callback`, `exp://**`
   - Confirm email: `OFF` (for QA signup)
   - Log all changes in `docs/reports/DASHBOARD_CHANGELOG.md`.
7. **Start Metro for phone scan:**
   ```powershell
   npx expo start -c
   ```
   *(Use `npx expo start --tunnel` if university/office Wi-Fi isolates LAN clients.)*
