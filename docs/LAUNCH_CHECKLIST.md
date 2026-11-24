# Khidmat — Play Store Launch Checklist

What must happen before a **public** release. Items marked ✅ are done in code;
⚙️ are configuration the owner must set; 💰 need a paid third-party account.

---

## 🎯 Priority Matrix

### P0: Launch Blockers (Must Have)

- [ ] ⚙️ **App Icon & Splash Screen:** Generate/setup high-quality assets in `app.json` for professional store presence.
- [ ] ⚙️ **Push Notifications:** Setup Expo Push Tokens and Supabase triggers (`supabase/functions/push-dispatcher`) to alert users on chat messages, KYC, and booking updates.
- [ ] ⚙️ **Live Backend Migration:** Apply migrations `0001 → 0014` to production Supabase project (`EXPO_PUBLIC_USE_MOCK=false`).
- [ ] ⚙️ **Legal & Privacy Submission:** Submit public Privacy Policy URL and Data Safety form in Play Console.

### P1: Production Readiness (High Priority)

- [x] ✅ **In-App Account Deletion:** Google Play compliant self-serve account deletion & data anonymization in Profile (`0011_account_deletion.sql`, cascading KYC cleanup in `0013_kyc_and_security_hardening.sql`).
- [x] ✅ **User Reporting & Moderation:** Reporting flow for inappropriate content and provider harassment with admin console moderation (`0012_user_reports.sql`).
- [x] ✅ **Realtime Low-Overhead Tracking:** Live GPS tracking migrated to Supabase Realtime Broadcast channels (`tracking:{bookingId}`).
- [x] ✅ **Atomic Status Transitions & Price Lock:** Race-condition-free booking state machine (`0009_booking_state_machine.sql`) and immutable accepted prices (`0014_rls_hardening.sql`).
- [x] ✅ **KYC Document Isolation:** Private bucket, signed URLs, owner-only uploads, and audited admin reads (`0013_kyc_and_security_hardening.sql`).
- [x] ✅ **Mock Fallback Removal:** Silent mock client removed; production config error proxy safely handles missing backend URL without silently faking data.
- [x] ✅ **Automated CI Secret Scanning:** Git commit and PR scans actively detect private keys and non-anon JWTs.
- [ ] ⚙️ **Crash Reporting (Sentry):** Integrate `@sentry/react-native` to catch and monitor production crashes in real-time (PII scrubbers already built).
- [ ] ⚙️ **EAS OTA Updates:** Configure `expo-updates` so we can push instant bug fixes to users without waiting for Play Store reviews.
- [ ] ⚙️ **First Admin Bootstrap:** Promote ops email to `role = 'admin'` in Supabase SQL editor.

### P2: Future Enhancements (Post-Launch)

- [ ] 💰 **Payment Gateway Integration:** Implement JazzCash, EasyPaisa, or Stripe for in-app cashless transactions (v1 launches with Cash on Delivery / Hand).
- [ ] 💰 **Phone / SMS OTP:** Configure Twilio / SMS provider in Supabase Auth when expanding beyond email login.

---

## Detailed Launch Steps

### 1. Cut over from demo to the live backend

The app currently runs on in-memory mock data (`EXPO_PUBLIC_DEMO_MODE=true` in `.env`).

```bash
# 1. Apply every migration to the real Supabase project (0001 … 0014).
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 2. Turn demo mode OFF for a production build.
#    .env / EAS env:  EXPO_PUBLIC_USE_MOCK=false
```

- ✅ Migrations `0001_init` … `0014_rls_hardening` exist and are tested.
- ⚙️ Verify against the live DB: sign up → browse providers → book → chat →
  complete → review → reschedule → cancel → notifications.
- 💡 `EXPO_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` are safe to ship (anon key is
  public; real protection is RLS). Never put the `service_role` key in the app.

### 2. Legal (Play Store hard requirement)

- ✅ In-app `Privacy Policy` (`/privacy`), `Terms of Service` (`/terms`), and `Safety Guidelines` (`/safety`) screens,
  linked from Profile → Legal & Support.
- ⚙️ Publish a **public privacy-policy URL** (host `privacy.tsx` content on a website)
  and enter it in the Play Console → App content → Privacy policy.
- ⚙️ Fill the **Data safety form**: account, name, phone, email, approximate +
  precise location (during booking), in-app chat text, notification token, photo
  (avatar). State: no sale of data, account deletion supported.
- ⚙️ Provide an in-app or URL **account-deletion** path (email `privacy@khidmat.app`
  is referenced; account deletion flow built into app).

### 3. Admin / provider vetting & moderation

- ✅ `admin` role, `is_admin()` RLS helper, provider **verification queue** and
  **review moderation** (hide/unhide/delete) in `app/admin.tsx`.
- ⚙️ Bootstrap the first admin. After signup, in the Supabase SQL editor:
  ```sql
  update public.profiles set role = 'admin' where email = 'you@khidmat.app';
  ```
  (or demo login: `admin@khidmat.app` / `123456`).
- ⚙️ Agree the real-world vetting steps that back the "verified" badge
  (CNIC/NICOP check, references) — the app records `verification_status` but a
  human must run the checks.

### 4. Auth & contactability

- ✅ Email/password auth, password reset deep link (`khidmat://reset-password`).
- 💰 Phone/SMS OTP is **flag-gated OFF** (`EXPO_PUBLIC_PHONE_AUTH_ENABLED`). Enabling
  needs a Twilio (or similar) sender configured under Supabase Auth → Phone.

### 5. Payments

- ✅ COD ledger works end-to-end (providers are paid in cash).
- 💰 JazzCash / EasyPaisa / card are **stubs** on `agent-server` gated by
  `PAYMENTS_ENABLED`. Going live needs merchant accounts + `GW_*` secrets on the
  server. Launch with COD; add gateways later.

### 6. Push notifications

- ✅ Expo push + Alerts tab + deep-links.
- ⚙️ Provide a **Google Cloud FCM** server key in EAS project creds so Android
  deliveries work in production (`eas.json` / Expo application id).

### 7. Build, signing & store listing

- ⚙️ Create an EAS build profile: `eas build -p android --profile production`.
- ⚙️ Generate an **upload keystore** + Play App Signing; set version/build number
  (currently `1.0.0`).
- ⚙️ Store assets: app icon, ≥2 screenshots, feature graphic, short/full
  description, category, contact email.
- 💡 Optional: `EXPO_PUBLIC_EMAIL_ENABLED`, PostHog `key` for analytics (both inert now).

### 8. Quality gates (must be green before shipping)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # jest
```

- CI (`.github/workflows/ci.yml`) already runs all three on push/PR.

---

## Definition of "ready"

Items **1, 2, 3** are free and blocking for a compliant Play Store release — done in
code here; the ⚙️ owner-config steps remain. **4/5/6** (OTP, gateways, FCM) and
💰 analytics depend on paid accounts/credentials and can ship as COD-only v1.
