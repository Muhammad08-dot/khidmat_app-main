# Khidmat — Play Store Launch Checklist

What must happen before a **public** release. Items marked ✅ are done in code;
⚙️ are configuration the owner must set; 💰 need a paid third-party account.

## 1. Cut over from demo to the live backend
The app currently runs on in-memory mock data (`EXPO_PUBLIC_DEMO_MODE=true` in `.env`).

```bash
# 1. Apply every migration to the real Supabase project (0002 … 0007).
npx supabase link --project-ref ohkemvlmlhqoptqhxyxw
npx supabase db push

# 2. Turn demo mode OFF for a production build.
#    .env / EAS env:  EXPO_PUBLIC_DEMO_MODE=false
```
- ✅ Migrations `0002_legacy_bridge` … `0007_admin_moderation` exist.
- ⚙️ Verify against the live DB: sign up → browse providers → book → chat →
  complete → review → reschedule → cancel → notifications.
- 💡 `EXPO_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` are safe to ship (anon key is
  public; real protection is RLS). Never put the `service_role` key in the app.

## 2. Legal (Play Store hard requirement)
- ✅ In-app `Privacy Policy` (`/privacy`) and `Terms of Service` (`/terms`) screens,
  linked from Profile → Legal & Support.
- ⚙️ Publish a **public privacy-policy URL** (host `privacy.tsx` content on a website)
  and enter it in the Play Console → App content → Privacy policy.
- ⚙️ Fill the **Data safety form**: account, name, phone, email, approximate +
  precise location (during booking), in-app chat text, notification token, photo
  (avatar). State: no sale of data, account deletion supported.
- ⚙️ Provide an in-app or URL **account-deletion** path (email `privacy@khidmat.app`
  is referenced; ideally add a real delete action or a support flow).

## 3. Admin / provider vetting & moderation
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

## 4. Auth & contactability
- ✅ Email/password auth, password reset deep link (`khidmat://reset-password`).
- 💰 Phone/SMS OTP is **flag-gated OFF** (`EXPO_PUBLIC_PHONE_AUTH_ENABLED`). Enabling
  needs a Twilio (or similar) sender configured under Supabase Auth → Phone.

## 5. Payments
- ✅ COD ledger works end-to-end (providers are paid in cash).
- 💰 JazzCash / EasyPaisa / card are **stubs** on `agent-server` gated by
  `PAYMENTS_ENABLED`. Going live needs merchant accounts + `GW_*` secrets on the
  server. Launch with COD; add gateways later.

## 6. Push notifications
- ✅ Expo push + Alerts tab + deep-links.
- ⚙️ Provide a **Google Cloud FCM** server key in EAS project creds so Android
  deliveries work in production (`eas.json` / Expo application id).

## 7. Build, signing & store listing
- ⚙️ Create an EAS build profile: `eas build -p android --profile production`.
- ⚙️ Generate an **upload keystore** + Play App Signing; set version/build number
  (currently `1.0.0`).
- ⚙️ Store assets: app icon, ≥2 screenshots, feature graphic, short/full
  description, category, contact email.
- 💡 Optional: `EXPO_PUBLIC_EMAIL_ENABLED`, PostHog `key` for analytics (both inert now).

## 8. Quality gates (must be green before shipping)
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # jest
```
- CI (`.github/workflows/ci.yml`) already runs all three on push/PR.

## Definition of "ready"
Items **1, 2, 3** are free and blocking for a compliant Play Store release — done in
code here; the ⚙️ owner-config steps remain. **4/5/6** (OTP, gateways, FCM) and
💰 analytics depend on paid accounts/credentials and can ship as COD-only v1.
