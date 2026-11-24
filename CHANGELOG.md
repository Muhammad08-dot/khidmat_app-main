# Changelog — Khidmat Platform Stabilization & Production Readiness

All notable changes made to stabilize, harden, test, and complete the Khidmat platform are documented in this file.

---

## [1.1.0] — Stabilization, Security Hardening & Feature Completion

### 🚨 Critical Fixes

- **Realtime GPS Tracking Overhaul (`app/(booking)/track/[id].tsx`):**
  - Migrated high-frequency location updates from continuous PostgreSQL database writes (which overloaded the database every 6 seconds) to ephemeral **Supabase Realtime Broadcast** WebSockets on channel `tracking:{bookingId}`.
  - Implemented channel cleanup on unmount and throttled periodic DB fallback write (maximum once per 60 seconds).
  - Extended in-memory `mockClient.ts` to support broadcast pub/sub for offline demo tracking.
- **Booking Status Concurrency & State Machine (`0009_booking_state_machine.sql`):**
  - Added atomic conditional updates (`UPDATE bookings WHERE id = ? AND status = ?`) and PostgreSQL RPC `transition_booking_status`.
  - Defined rigid allowed lifecycle transitions: `pending → confirmed → in_progress → completed → reviewed → closed` (with permitted transitions to `cancelled` and `rejected`).
  - Added collision detection in `app/(tabs)/bookings.tsx` and `ProviderHome.tsx` to prevent simultaneous accept/cancel state corruption.
- **Background Push Notification Dispatcher (`0010_push_notifications_trigger.sql`):**
  - Built Supabase Edge Function `push-dispatcher` for automated Expo Push delivery.
  - Added database triggers on `profiles.verification_status` (KYC approvals/rejections) and `bookings.status`.
  - Added cold-start notification handling via `Notifications.getLastNotificationResponseAsync()` and deep-linking in `app/_layout.tsx`.

### 🛡️ Security & Compliance

- **PII Scrubbing (`src/services/api/errorReporter.ts` & `agent-server/src/index.ts`):**
  - Created `scrubPII` function to automatically strip Pakistani CNIC numbers, mobile phone numbers, JWT/Bearer authentication tokens, email addresses, and residential street addresses before crash reports are logged or sent to LLM endpoints.
- **In-App Account Deletion (`0011_account_deletion.sql`):**
  - Added in-app "Delete Account" flow in `app/(tabs)/profile.tsx` under Legal & Support with destructive confirmation.
  - Added database RPC and query function `deleteUserAccount` to permanently purge profile contacts, push tokens, notifications, and anonymize user activity for Google Play Store compliance.
- **AI Model Upgrade & Configuration:**
  - Upgraded Google Gemini integration in `agent-server` to configurable environment variable `GEMINI_MODEL=gemini-2.5-flash` with fallback to `gemini-2.0-flash`.

### ✨ New Features & Enhancements

- **User & Review Moderation System (`0012_user_reports.sql`):**
  - Added `user_reports` table and reporting flow in `app/chat.tsx` allowing customers and providers to report harassment, safety concerns, or fraud.
  - Added "Reports" moderation tab in `app/admin.tsx` console allowing operations admins to review, action, and dismiss user reports.
- **Booking Cancellation Flow & Provider Reassignment:**
  - Standardized cancellation reason options with modal dialog and notifications.
  - Added 1-tap "Find Alternative Provider" reassignment shortcut on cancelled booking cards.
- **Booking History Filter & Pagination:**
  - Added "Cancelled" filter tab alongside "All", "Pending", "Confirmed", and "Completed".
  - Implemented client-side pagination with "Load More" controls.
- **Anti-Spam / Rate Limiting:**
  - Enforced debounce rate limits on rapid chat messaging and duplicate booking submissions.
- **Cash on Delivery (COD) Confirmation Step:**
  - Added explicit "Cash payment received" toggle in provider job completion dialog.
  - Linked customer star rating submission to automatic settlement recording in `payments` ledger.

### 🧪 Tests & Quality Gates

- **10 Test Suites / 38 Tests (100% Passing):**
  - Added unit and integration suites: `trackingBroadcast.test.ts`, `bookingStatusRace.test.ts`, `errorReporter.test.ts`, `phase3Features.test.ts`.
  - Maintained 100% key parity between English and Urdu (`en.json` & `ur.json`).
  - Strict TypeScript check (`tsc --noEmit`) and ESLint passing with zero errors.
