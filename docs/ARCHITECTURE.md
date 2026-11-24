# Khidmat App — System Architecture & Production Design

## 1. Executive Summary

**Khidmat** is an on-demand hyperlocal home services mobile platform tailored for Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad). Built with **Expo SDK 57**, **React Native 0.86**, **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, Realtime), and an Express-based **Agent Server** powering Gemini 2.5 AI intent extraction, self-healing diagnostic proposals, and voice transcription.

The system is designed with dual-engine flexibility:

- **Production Mode:** Full Supabase Auth, PostgreSQL RLS policies, Realtime broadcast channels, Deno Edge Function push dispatching, and secure bucket storage.
- **Demo Mode (`EXPO_PUBLIC_DEMO_MODE=true`):** Zero-API-key client simulation via `mockClient.ts` with in-memory storage, simulated broadcast event loops, and localized Pakistani mock datasets.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            MOBILE CLIENT (Expo SDK 57)                            |
|                                                                                   |
|  +-------------------------+  +-------------------------+  +--------------------+ |
|  |     Customer Flows      |  |     Provider Flows      |  |    Admin Console   | |
|  |  Intent, Search, Book,  |  |  Job Accept, Navigate,  |  |  KYC Verification, | |
|  |   Track, Chat, Rate     |  |   COD Collect, Complete |  |  Reviews, Reports| |
|  +-------------------------+  +-------------------------+  +--------------------+ |
|                                                                                   |
|  +------------------------------------------------------------------------------+ |
|  |                State & Network: Zustand + React Query Hooks                  | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
             |                                              |
      REST / WebSockets                             HTTP / RPC
             v                                              v
+-----------------------------+               +-------------------------------------+
|      SUPABASE BACKEND       |               |          AI AGENT SERVER            |
|                             |               |             (Node/Express)          |
| * PostgreSQL 15 + RLS       |               | * Gemini 2.5 Flash Intent Engine    |
| * Realtime Broadcast        |<=============>| * PII-Scrubbed Error Diagnostic     |
| * Deno Push Dispatcher EF   |               | * Audio Voice Transcription         |
| * Secure Document Storage   |               +-------------------------------------+
+-----------------------------+                                 |
             |                                                  v
             v                                        +---------------------+
+-----------------------------+                       |   Google Gemini API |
|   Expo Push Notification    |                       +---------------------+
|          Service            |
+-----------------------------+
```

---

## 3. Core Subsystems

### 3.1 Realtime Low-Overhead Live Tracking

- **Previous Bottleneck:** Writing GPS coordinates every 6 seconds directly to the PostgreSQL `bookings` table caused excessive database I/O and connection saturation during peak active jobs.
- **Current Architecture:**
  1. Provider publishes coordinates via Supabase Realtime **Broadcast Channel**: `tracking:{bookingId}` with event `location`.
  2. Customer device subscribes to `tracking:{bookingId}` and animates the provider marker on Google Maps/Apple Maps in real-time without database round-trips.
  3. Database writes occur **only** on status transitions (`in_progress`, `completed`) with a fallback write throttled to at most once every 60 seconds for historical auditing.
  4. Tested and verified in `src/services/supabase/__tests__/trackingBroadcast.test.ts`.

### 3.2 Atomic Booking State Machine

- **Previous Bottleneck:** Simultaneous customer cancellation and provider acceptance created race conditions and inconsistent states.
- **Current Architecture:**
  1. State transition rules strictly defined in `src/services/supabase/queries.ts` (`ALLOWED_TRANSITIONS`).
  2. Transitions enforced via conditional PostgreSQL atomic queries: `UPDATE bookings SET status = $target WHERE id = $id AND status = $expected`.
  3. PostgreSQL stored procedure & trigger in `supabase/migrations/0009_booking_state_machine.sql` reject invalid transitions at the database level.
  4. Mutual exclusion verified with concurrent execution tests in `src/services/supabase/__tests__/bookingStatusRace.test.ts`.

### 3.3 Push Notification Architecture

- **Trigger Layer:** PostgreSQL trigger (`supabase/migrations/0010_push_notifications_trigger.sql`) sends webhooks or invokes Deno Edge Function `supabase/functions/push-dispatcher/index.ts`.
- **Payload Events:**
  - `new_booking`: Notifies provider of incoming request.
  - `booking_status`: Notifies customer of acceptance, arrival, completion, or cancellation.
  - `chat_message`: Notifies offline recipients of direct chat messages.
  - `kyc_update`: Notifies providers when verification is approved or rejected.
- **Client Handling:** `app/_layout.tsx` handles foreground notification display and background/cold-start deep linking via `expo-notifications`.

### 3.4 PII Scrubbing & Error Reporting

- Errors reported from client (`src/services/api/errorReporter.ts`) or server (`agent-server/src/index.ts`) pass through strict regex filters before transmission:
  - Pakistani CNIC (`\b\d{5}-\d{7}-\d\b` or `\b\d{13}\b`)
  - Pakistani Phone Numbers (`\b(\+92|0092|92|0)?3\d{2}[- ]?\d{7}\b`)
  - JWT Tokens (`\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b`)
  - Email addresses and street addresses
- The agent diagnostic endpoint `/api/heal` is strictly **propose-only**; automatic code patching is disabled in production to safeguard runtime integrity.

---

## 4. Database Migrations Overview

- `0001_initial_schema.sql`: Base tables (`profiles`, `categories`, `services`, `bookings`, `reviews`, `chat_messages`).
- `0002_rls_policies.sql`: Row-level security for customers, providers, and admins.
- `0003_kyc_verification.sql`: Verification documents and provider statuses.
- `0004_settlement_ledger.sql`: Cash on Delivery (COD) accounting and commission tracking.
- `0005_mock_seed.sql`: Pakistani seed data for demo and staging environments.
- `0006_search_and_geo.sql`: Haversine distance functions and spatial search indices.
- `0007_admin_audit.sql`: Audit logging for moderation and KYC approvals.
- `0008_error_reports.sql`: Diagnostic logs and telemetry.
- `0009_booking_state_machine.sql`: Server-side status transition guard function.
- `0010_push_notifications_trigger.sql`: Event-driven push notifications trigger queue.
- `0011_account_deletion.sql`: GDPR & Google Play compliant account anonymization and hard-deletion cascade.
- `0012_user_reports.sql`: Content moderation and abuse reporting table with admin resolution workflows.

---

## 5. Security & Compliance

1. **Row Level Security (RLS):** Every table has enabled RLS. Customers cannot read or mutate other customers' bookings; providers only access assigned jobs; admin operations require `role = 'admin'`.
2. **Account Deletion:** Users can self-delete accounts directly in `/profile`. Booking records are pseudonymized for tax and ledger requirements, while credentials, personal phone numbers, and profile avatars are permanently wiped.
3. **Demo Safeguards:** Hardcoded demo accounts (`*@khidmat.app / 123456`) are strictly conditional on `EXPO_PUBLIC_DEMO_MODE=true` and disabled in release builds.
