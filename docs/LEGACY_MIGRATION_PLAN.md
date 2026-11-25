# Khidmat — Legacy Migration & Deprecation Plan

This document defines the formal deprecation and migration plan for `src/services/supabase/legacy.ts` in accordance with PRD v2 §4 (Phase 4b).

---

## 1. Overview & Current Dependencies

Static analysis (`git grep -n "from.*legacy" -- app src`) reveals that `legacy.ts` is still actively imported by **12 files** across the codebase (including 9 UI routes/screens, 1 context provider, and 2 service modules):

| File | Imported Identifiers | Target Replacement in Phase 4b |
| :--- | :--- | :--- |
| `app/(booking)/booking.tsx` | `getDocument`, `writeDocument` | `createBooking()`, `getServiceById()` in `queries.ts` |
| `app/(booking)/track/[id].tsx` | `listenToBookings` | Realtime channel subscriber via `src/services/supabase/tracking.ts` |
| `app/(tabs)/bookings.tsx` | `fetchBookings`, `cancelBooking` | `listUserBookings()`, `cancelBooking()` in `queries.ts` |
| `app/(tabs)/inbox.tsx` | `listenToBookings` | Realtime message list subscriber in `src/services/supabase/messages.ts` |
| `app/(tabs)/profile.tsx` | `uploadProfilePhoto` | `uploadAvatar()` in `src/services/supabase/storage.ts` |
| `app/chat.tsx` | `getDocument` | `getBookingDetails()` in `queries.ts` |
| `app/provider/[id].tsx` | `getProvider` | `getProviderProfile()` in `queries.ts` |
| `app/providers.tsx` | `getProviders` | `listActiveProviders()` in `queries.ts` |
| `src/components/features/ProviderHome.tsx` | `uploadJobMedia`, `mergeBookingMeta` | `uploadJobMedia()`, `updateBooking()` in `queries.ts` |
| `src/context/AuthContext.tsx` | `profileColumnsFromCamel` | `transformProfileRow()` in `src/utils/transformers.ts` |
| `src/services/supabase/queries.ts` | `mapBookingRow`, `recomputeProviderRating` | Native typed internal functions within `queries.ts` |
| `src/services/supabase/__tests__/legacy.test.ts` | `*` | Deprecated and removed alongside `legacy.ts` |

---

## 2. Safety Invariant (Why `legacy.ts` Cannot Be Removed in Wave 1)

Per the Hardening Agent brief:
> *"Remove `legacy.ts` + `legacy.test.ts` only if `git grep` shows nothing in `app/` or `src/components/` imports it (never edit migration 0002)."*

Removing `legacy.ts` during Wave 1 while Agent 1 is finalizing Phase 2 UI modernization would break 9 customer and provider screens. Therefore:
1. `legacy.ts` and `legacy.test.ts` are preserved throughout Wave 1.
2. In Phase 4b (post-merge), each UI route will be migrated one by one to use the modern typed functions in `queries.ts`.
3. Once `git grep "from.*legacy" -- app src` returns 0 hits, `legacy.ts` and `legacy.test.ts` will be cleanly deleted in a dedicated commit (`refactor(supabase): P4-3 remove legacy bridge and tests`).

---

## 3. Deprecation Timeline & Acceptance Criteria

- **Phase 4b Step 1:** Replace `legacy.ts` imports in `app/(auth)/` and `src/context/`.
- **Phase 4b Step 2:** Replace `legacy.ts` imports in customer booking and tracking screens.
- **Phase 4b Step 3:** Replace `legacy.ts` imports in provider dashboard and profile screens.
- **Phase 4b Step 4:** Delete `legacy.ts` and `legacy.test.ts`. Confirm `npx tsc --noEmit` exits with 0.
