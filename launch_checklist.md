# Khidmat App - Play Store Launch Checklist

## P0: Launch Blockers (Must Have)
- [ ] **App Icon & Splash Screen:** Generate/setup high-quality assets in `app.json` for professional store presence.
- [ ] **Push Notifications:** Setup Expo Push Tokens and Supabase triggers to alert users on chat messages and booking updates.

## P1: Production Readiness (High Priority)
- [ ] **Crash Reporting (Sentry):** Integrate `@sentry/react-native` to catch and monitor production crashes in real-time.
- [ ] **EAS OTA Updates:** Configure `expo-updates` so we can push instant bug fixes to users without waiting for Play Store reviews.

## P2: Future Enhancements (Post-Launch)
- [ ] **Payment Gateway Integration:** Implement JazzCash, EasyPaisa, or Stripe for in-app cashless transactions. (v1 can rely on Cash on Hand).
