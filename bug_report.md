# Khidmat App - Pre-Launch Bug & Architecture Report

## 🚨 Critical Logic Bugs Found

### 1. High-Frequency GPS Tracking Overloading PostgreSQL (Location Tracking)
**File:** `app/(booking)/track/[id].tsx`
**Issue:** The app is sending GPS coordinates every 6 seconds directly to the `bookings` table using `writeDocument(...)`. 
**Impact:** 
- In production with 100+ active workers, this will bombard the Supabase Postgres database with thousands of UPDATE queries per minute. 
- It will cause database lock contention, spike CPU usage, and drain the Supabase quota.
- Overwriting the entire booking object (`...booking`) every 6 seconds creates race conditions. If the client and provider update their locations at the exact same time, one will overwrite the other.
**Fix:** Migrate location tracking to **Supabase Realtime Broadcast or Presence**. Ephemeral data like live GPS should *not* be stored in the Postgres table. It should only be broadcasted through WebSockets to the client listening on the other end.

### 2. Missing Race-Condition Handling in Status Updates
**File:** `app/(tabs)/bookings.tsx` (and `track/[id].tsx`)
**Issue:** Status updates (`pending` -> `confirmed`) are pushed blindly. 
**Impact:** A customer might cancel a booking at the exact millisecond a provider accepts it. Without checking the previous state, the provider might accidentally revive a cancelled booking.
**Fix:** Use RPC (Stored Procedures) in Supabase or add a strict `WHERE status = 'pending'` condition when updating to `confirmed`.

### 3. Missing Push Notification Triggers in Chat
**File:** `app/chat.tsx`
**Issue:** `useSendMessage` inserts messages into the `messages` table, but the receiver only gets them if they have the app open. 
**Impact:** If the app is minimized, the user will miss critical updates.
**Fix:** Add a Postgres Database Trigger on the `messages` table that calls an Edge Function (or Expo Push API directly) to send a push notification to the receiver.

## ✅ Next Steps
I highly recommend fixing **Bug #1 (Location Tracking)** immediately before launch, as it will physically crash your database under load. Should I rewrite the `track/[id].tsx` file to use Supabase Realtime Broadcast instead of Postgres writes?
