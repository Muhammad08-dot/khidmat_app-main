# Khidmat (خدمت) v2.0.0 — Master Project Status Report

**Prepared on Behalf of:**
- **Agent 1 (UI & UX Modernization Agent)** — `feat/prd-v2-ui` (merged into `feat/prd-v2`)
- **Agent 2 (Reliability, Security & Hardening Agent)** — `feat/prd-v2-hardening`

**Date:** November 24, 2026  
**Status:** **PHASE 0, 1, 2, 3, 4a COMPLETE** | **WAVE 1 HARDENING IN REVIEW** | **PHASE 4b, 5, 6 NOT COMPLETE / NOT LAUNCH-READY**

---

## 1. Honest Status Summary

- **Completed:**
  - **Phase 0 & 1 (Auth & Direction):** PKCE OAuth redirect (`khidmat://auth/callback`), RTL direction single source of truth, demo login gating (`EXPO_PUBLIC_ENABLE_DEMO`).
  - **Phase 2 (UI Modernization):** Merged into `feat/prd-v2` and `feat/prd-v2-hardening`.
  - **Phase 3 (Security & Hardening) & Wave 1 Fixes:**
    - Removed silent mock fallback (`ConfigError` proxy in `src/services/supabase/client.ts`).
    - Added `scripts/secret-scan.js` and removed secrets from `eas.json`.
    - Authored `0013_kyc_and_security_hardening.sql` (private `kyc-documents` bucket, signed URLs, Storage API purge flow in `src/services/supabase/accountDeletion.ts` + Edge Function `supabase/functions/delete-account/index.ts`, booking PII anonymization).
    - Authored `0014_rls_hardening.sql` (role escalation guard covering `INSERT`/`UPDATE` while preserving `customer <-> provider` selection, accepted/completion price lock, append-only `admin_actions`, city-scoped pending booking visibility, role-aware `transition_booking_status` restoring `0009` rules).
    - Hardened `agent-server` (JWT validation, Zod input validation, rate limiting, CORS).
  - **Phase 4a (Safe Non-UI Cleanup):** Removed dead directories (`archive/`, `scratch/`, `docs/archive/`, `complete_setup.sql`), consolidated docs, relocated E2E scripts, extracted `src/services/supabase/mappers.ts`.
- **Not Complete / Remaining:**
  - **Phase 4b:** Retiring `src/services/supabase/legacy.ts` (10 remaining import sites across UI/tests) and pruning unused UI components/tokens.
  - **Phase 5:** Live cloud integration tests (`node scripts/test-integration.js`) are **NOT RUN / SKIPPED** until owner provisions `khidmat-test` and `.env.test`.
  - **Phase 6:** Production migrations (`0001`–`0014`), OAuth configuration, first admin bootstrap, EAS production builds, and Play Console submission are **NOT DONE**.

---

## 2. Database Migrations Ledger (`supabase/migrations/`)

Generated from actual migration filenames on disk (`scripts/generate-migration-ledger.js`):

| # | Migration File | Status | Description |
| :--- | :--- | :---: | :--- |
| 0001 | `0001_init.sql` | Applied / Frozen | Core schema: profiles, services, bookings, reviews, and basic RLS |
| 0002 | `0002_legacy_bridge.sql` | Applied / Frozen | Legacy schema compatibility views, columns, and bridge functions |
| 0003 | `0003_phase3_features.sql` | Applied / Frozen | Storage buckets setup for avatars, media, and KYC assets |
| 0004 | `0004_chat_push.sql` | Applied / Frozen | In-app chat messaging schema and message push notification hooks |
| 0005 | `0005_chat_seen_receipts.sql` | Applied / Frozen | Realtime message delivery and read receipts support |
| 0006 | `0006_saved_addresses.sql` | Applied / Frozen | Customer saved location addresses and coordinates |
| 0007 | `0007_admin_moderation.sql` | Applied / Frozen | Admin role helper, provider verification, and moderation queues |
| 0008 | `0008_security_hardening.sql` | Applied / Frozen | Enhanced security policies and cross-user read restrictions |
| 0009 | `0009_booking_state_machine.sql` | Applied / Frozen | Atomic booking transition state machine and server-side transition guards |
| 0010 | `0010_push_notifications_trigger.sql` | Applied / Frozen | Automated push notification dispatch triggers on status events |
| 0011 | `0011_account_deletion.sql` | Applied / Frozen | Self-serve account deletion and data anonymization function |
| 0012 | `0012_user_reports.sql` | Applied / Frozen | User reporting system and admin moderation resolution audit |
| 0013 | `0013_kyc_and_security_hardening.sql` | **Unapplied (Wave 1)** | Private KYC bucket, signed URLs, owner/admin storage RLS, PII-safe deletion |
| 0014 | `0014_rls_hardening.sql` | **Unapplied (Wave 1)** | Anti-role escalation trigger, completion price lock, append-only audit, transition rules |

---

## 3. Owner-Only Actions Before Launch

1. **Apply Migrations to Production & Test Supabase:**
   ```bash
   npx supabase link --project-ref <your-supabase-project-id>
   npx supabase db push
   ```
2. **Configure Exact Google OAuth Redirect URLs (No Wildcards):**
   - Site URL: `khidmat://auth/callback`
   - Redirect URLs: `khidmat://auth/callback` (do **not** use wildcard `khidmat://*`).
3. **Provision `khidmat-test` & GitHub Secrets:**
   - Set `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY` in `.env.test` (local) and GitHub repository secrets (CI).
4. **Bootstrap First Admin & Deploy Edge Function:**
   - Deploy `supabase/functions/delete-account`.
   - Bootstrap initial admin via SQL Editor (`UPDATE public.profiles SET role = 'admin' WHERE id = '<admin-uuid>';`).
5. **Latest Raw Gate Outputs:** See [PHASE_REPORTS_HARDENING.md](./PHASE_REPORTS_HARDENING.md).
