# Khidmat App — Bug & QA Audit Tracking Report

## 1. Core Logic & Architecture Issues (Verified & Fixed)

### 1. High-Frequency GPS Tracking Overloading PostgreSQL
- **File:** `app/(booking)/track/[id].tsx`
- **Issue:** The app sent GPS coordinates every 6 seconds directly to the PostgreSQL `bookings` table, saturating database connections.
- **Status:** ✅ **FIXED** (Migrated to Supabase Realtime Broadcast channel `tracking:{bookingId}`; database fallback writes throttled to at most once per 60 seconds; verified in `trackingBroadcast.test.ts`).

### 2. Missing Race-Condition Handling in Status Updates
- **File:** `app/(tabs)/bookings.tsx`, `track/[id].tsx`, `queries.ts`
- **Issue:** Status transitions were pushed without atomic conditional updates, creating potential race conditions on simultaneous accept and cancel.
- **Status:** ✅ **FIXED** (Defined strict transition rules in `queries.ts` and `0009_booking_state_machine.sql`; atomic conditional update `WHERE id = ? AND status = ?`; verified in `bookingStatusRace.test.ts`).

### 3. Missing Push Notification Triggers in Background
- **File:** `app/chat.tsx`, `src/services/push.ts`
- **Issue:** Messages and status updates only reached users if their app was actively foregrounded.
- **Status:** ✅ **FIXED** (Added `0010_push_notifications_trigger.sql` and Deno Edge Function `supabase/functions/push-dispatcher/index.ts` with deep linking in `app/_layout.tsx`).

### 4. Enterprise Cloud Management Policy Failure in Automated Browser Testing
- **Source:** Chromium enterprise registry policy conflict on host system.
- **Status:** ✅ **FIXED** (Installed policy-free standalone Chrome for Testing `chrome@157.0.8103.78` in `chrome/win64-157.0.8103.78/` for autonomous Puppeteer execution).

### 5. Agent Server TypeScript Configuration Extends Expo
- **File:** `agent-server/tsconfig.json`
- **Issue:** Extended `"expo/tsconfig.base"` in a pure Node/Express backend, failing CI jobs when Expo is not in `agent-server/node_modules`.
- **Status:** ✅ **FIXED** (Removed Expo extension; verified clean typecheck on GitHub Actions CI).

---

## 2. QA E2E Browser Test Findings (30/30 Flows Passed)
- **Authentication Flows:** Empty field validation, wrong password notice, valid customer login, session persistence, password reset link, customer logout.
- **Customer Flows:** Category browse (8 categories), search/AI intent input, provider profile review, bookings list with status tabs, cancellation modal, in-app account deletion UI.
- **Provider Flows:** ProviderHome dashboard, online/offline availability switch, incoming job request list with action buttons, earnings display.
- **Admin Flows:** Strict non-admin route blocking, admin console unlock, KYC verification queue, abuse reports moderation tab, append-only audit log.
- **General & UI:** Privacy, Terms, Safety screens, 404 page, tablet (768px) and desktop (1280px) responsive viewports, 100% Urdu/English translation parity.
