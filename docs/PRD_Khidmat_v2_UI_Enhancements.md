# Khidmat v2 — UI & UX Enhancements PRD

**Date:** 2026-11-25  
**Branch:** `feat/prd-v2-hardening`  
**Trigger:** Owner device QA screenshots & feedback

---

## 1. Goals & Requirements

| ID | Requirement | Target Files | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **UI-E1** | **Home AI Chatbot + Greeting Move** | `src/components/features/CustomerHome.tsx`, `src/components/features/SiteAgentWidget.tsx` | Remove `"Assalamu Alaikum"` and user name from Home top bar; show clean brand/city/bell bar with safe-area padding. Add a prominent **Khidmat AI Assistant** card on Home that opens the AI chatbot, and have the AI Agent greet the user with `"Assalamu Alaikum, {name}!"` on open/launch. |
| **UI-E2** | **Font Size Control (A- / A / A+)** | `src/context/PreferencesContext.tsx`, `app/(tabs)/profile.tsx`, `app/_layout.tsx` | Add persisted Font Size selector (`Small` 0.9x, `Normal` 1.0x, `Large` 1.15x) in Profile, backed by `AsyncStorage` and `PreferencesContext` (`fontScale`, `scaled(px)`). |
| **UI-E3** | **Theme Changer (Light / Dark / System)** | `src/context/PreferencesContext.tsx`, `app/(tabs)/profile.tsx`, `app/_layout.tsx` | Add persisted Theme selector (`Light`, `Dark`, `System`) in Profile; updates root background, `StatusBar` style, and dark/light surfaces immediately without triggering NativeWind `LinkingContext` crash. |
| **UI-E4** | **Matched Workers Vertical Centering** | `app/providers.tsx` | When `providers.length === 0` or `error` state is shown, vertically center the empty/error card in the middle of the screen (`flex-1 justify-center`). When worker cards exist, render from top and scroll normally. |
| **UI-E5** | **Status Bar Safe-Area & Language Contrast Fix** | `CustomerHome.tsx`, `app/providers.tsx`, `app/chat.tsx`, `app/(tabs)/profile.tsx` | Add `useSafeAreaInsets().top` padding on Home, Matched Workers, Chat, and Profile headers so nothing overlaps Android status bar icons. Fix `English` active button contrast in Profile (`bg-primary` instead of `bg-secondary`). |

---

## 2. Chat Architecture & Legal/Free-Tier Compliance Note
- **Real vs Demo:** Chat (`app/chat.tsx`) uses `useChatMessages` + `useSendMessage` + Supabase Realtime broadcast/postgres_changes. In `EXPO_PUBLIC_DEMO_MODE=true` it persists in-memory via `mockClient.ts`; with live Supabase it persists in `public.messages` with RLS (`0014_rls_hardening.sql`).
- **Free Tier & Rules:** Supabase Free Tier includes 500MB Postgres + Realtime messaging (up to 200 concurrent connections). In-app booking chat is standard and compliant with app store rules when paired with user reporting (`user_reports`, already implemented).

