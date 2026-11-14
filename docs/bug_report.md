# Khidmat App - Pre-Launch Bug & Architecture Report

## 🚨 Critical Logic Bugs & Status Tracking

### 1. High-Frequency GPS Tracking Overloading PostgreSQL (Location Tracking)
- **File:** `app/(booking)/track/[id].tsx`
- **Issue:** The app sends GPS coordinates every 6 seconds directly to the `bookings` table using `writeDocument(...)`.
- **Status:** **REPRODUCED (Scheduled for Fix in Phase 1 Task 2.1)**
- **Planned Fix:** Migrate location tracking to Supabase Realtime Broadcast channel `tracking:{bookingId}`. Writes to DB dropped to near-zero (only fallback / status changes).

### 2. Missing Race-Condition Handling in Status Updates
- **File:** `app/(tabs)/bookings.tsx` (and `track/[id].tsx`, `queries.ts`)
- **Issue:** Status updates (`pending` -> `confirmed`) are pushed blindly without checking current state.
- **Status:** **REPRODUCED (Scheduled for Fix in Phase 1 Task 2.2)**
- **Planned Fix:** Add atomic conditional updates (`UPDATE bookings WHERE id = ? AND status = ?`) or PostgreSQL RPC `transition_booking_status`, rejecting illegal transitions server-side and client-side.

### 3. Missing Push Notification Triggers in Chat & Events
- **File:** `app/chat.tsx`, `src/services/push.ts`
- **Issue:** Messages and status updates only reach users if their app is foregrounded.
- **Status:** **REPRODUCED (Scheduled for Fix in Phase 1 Task 2.3)**
- **Planned Fix:** Add Supabase Edge Function / webhook integration for Expo Push tokens on chat messages and booking events with background payload and deep-link routing.
