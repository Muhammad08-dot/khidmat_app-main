# Khidmat App — Manual Device Verification Checklist

This checklist specifies the exact physical device validation procedures for pre-launch regression testing, edge-case network conditions, and device permission handling.

---

## 📱 Test Matrix

| Condition                      | Target Hardware / Emulator          | Key Verification Point                     | Expected Behavior                                                                                   |
| ------------------------------ | ----------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Android Low-End Device**     | 2GB / 3GB RAM (Android 10/11)       | Memory usage during Map & Camera workflows | No Out-Of-Memory (OOM) crashes when taking job completion photos or rendering Live Map.             |
| **Slow Network (3G / 2G)**     | 100kbps, 400ms latency throttle     | Intent parsing & Booking confirmation      | Smooth skeleton loaders; offline fallback kicks in for AI search within 3.5s; no freeze.            |
| **Location Permission Denied** | Android permission toggle OFF       | Provider search & Address booking          | App prompts gracefully, falls back to default city center coordinates, allows manual entry.         |
| **App Killed / Background**    | Task Manager kill during active job | Push notification receipt & deep link      | Notification arrives via Expo Push; tapping launches app and navigates to `/chat` or `/track/[id]`. |
| **Urdu RTL Layout**            | Android language set to Urdu        | Text direction, icons, layout symmetry     | UI mirrors cleanly from right to left; typography renders with Noto Nastaliq Urdu font.             |

---

## 📋 Step-by-Step Test Scenarios

### Scenario 1: End-to-End Happy Path (Customer to Provider)

1. **Login as Customer:**
   - Launch app (Demo mode or live backend).
   - Sign in with `demo@khidmat.app` / `123456`.
2. **Search Service with AI:**
   - Enter _"Pankha theek karwana hai"_ or _"Kitchen tap is broken"_.
   - Verify category auto-detects **Electrician** or **Plumber**.
3. **Select Provider & Confirm Booking:**
   - Tap provider **Bilal Ahmed**.
   - Select date and time slot (Morning).
   - Choose saved address **Home**.
   - Confirm booking.
4. **Provider Acceptance:**
   - Switch account or open worker view with `bilal@khidmat.app`.
   - See incoming pending booking card.
   - Tap **Accept Booking** (`confirmed`).
5. **Realtime Chat & Coordination:**
   - Open Chat. Send quick reply: _"Aa gaya hoon"_.
   - Verify delivery and seen receipt checkmarks.
6. **Live GPS Tracking:**
   - Worker taps **Start Work** (`in_progress`).
   - Customer opens **Track Map**.
   - Verify provider icon updates location smoothly without crashing database.
7. **Job Completion & COD Payment:**
   - Worker takes a job photo, verifies **Cash payment received** checkbox, and taps **Mark as Completed**.
   - Customer reviews provider with 5 stars.
   - Verify status transitions to `closed` and ledger entry is recorded.

---

### Scenario 2: Concurrency & Status Collision (Race Condition)

1. Customer opens a pending booking.
2. Provider opens the same pending booking on another device.
3. Customer taps **Cancel Booking** and selects reason.
4. Provider simultaneously taps **Accept Booking**.
5. **Expected Outcome:** Exactly one action succeeds. The loser receives an explicit alert:
   _"Update Conflict: Could not update booking status because it was modified by the other party."_

---

### Scenario 3: In-App Account Deletion

1. Open **Profile** tab.
2. Scroll to bottom of Legal & Support card.
3. Tap **Delete Account**.
4. Read confirmation warning.
5. Tap **Delete My Account**.
6. **Expected Outcome:** User profile, saved addresses, and tokens are permanently purged; user is signed out and redirected to login screen.

---

### Scenario 4: User Reporting & Admin Moderation

1. Open active chat thread.
2. Tap the **Flag** icon in top right header.
3. Select report reason: _"Safety concern or harassment"_.
4. Enter details: _"Worker demanded excess charges"_.
5. Tap **Submit Report**.
6. Log in as `admin@khidmat.app` / `123456` and navigate to `/admin`.
7. Switch to **Reports** tab.
8. Verify report is visible with timestamp and reason.
9. Tap **Resolve & Action** or **Dismiss**.
