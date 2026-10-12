# Khidmat — On-Demand Home Services Platform

Khidmat connects customers with vetted local workers (electricians, plumbers, carpenters, cleaners, AC technicians) across Pakistan. Mobile-first Expo Router / React Native app, Supabase backend (Postgres + Auth + Realtime + Storage), Express proxy for AI + payment gateway, NativeWind design system with a warm forest-green + gold palette.

**Status today** → **Demo-ready** (in-memory Supabase mock, works with zero config). **Not yet live on Supabase** — migrations `0002 → 0008` still need to be applied to the real project (see [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)).

---

## Features

### Customer
- Email password sign-up / sign-in, password reset, phone-OTP sign-in behind a feature flag
- Service-intent capture (AI-parsed, with a graceful local fallback when `agent-server` is offline)
- Category browse + provider directory with tier badges, ratings, verification check
- Booking flow: address picker (map or manual), time slot, urgency, description, price estimate
- Live booking status: `pending → confirmed → in_progress → completed → reviewed → closed`
- Realtime chat with the assigned provider (text-only, quick-reply chips, seen receipts)
- Live map tracking of the worker on `in_progress` bookings
- Reviews + 1–5 star rating after job completion
- Reschedule an upcoming booking (with the provider)
- Saved addresses (home / office / custom labels, one-tap fill on booking form)
- Notifications inbox (in-app, realtime; expo push on native)

### Provider
- Same auth, worker mode toggle
- Job acceptance flow with base-price + travel-fee transparency
- Availability, bio, category, per-job pricing on their public page
- In-app chat with the customer + live location sharing on `in_progress`
- Earnings summary and job history

### Admin / back-office (`/admin`)
- Provider KYC verification queue — approve / reject; approve flips `verification_status`
- Review moderation — hide / unhide / delete, average rating auto-recomputes
- **Append-only audit log** (`admin_actions`) — every mutation records who / what / when

### Platform
- Legal screens shipped: `/privacy`, `/terms`, `/safety` (Play Store required)
- Bilingual string surface (`src/i18n/{en,ur}.json`) with parity tests, wired into auth + profile + legal
- Semantic design tokens (NativeWind + `BRAND` palette): `success / danger / warning / caution / info / muted`, cross-screen consistent

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 57 · React Native 0.86 · React 19.2 |
| Navigation | Expo Router (typed routes) |
| Backend | Supabase (Postgres 15 + Auth + Realtime + Storage) |
| Data fetching | TanStack React Query v5 |
| Styling | NativeWind 4 · Tailwind 3 |
| AI proxy | Express + LangChain (`agent-server/`) — Gemini or OpenAI |
| Payments (stubbed) | JazzCash / EasyPaisa server-side HMAC signing, feature-flagged off |
| Push | Expo Notifications (with an in-app notifications fallback) |
| Maps | `expo-maps` + `react-native-maps` (LiveMap) |
| Testing | Jest + jest-expo (5 unit + 1 integration = 6 suites / 25 tests currently) |
| CI | GitHub Actions — lint + tsc + jest |

---

## Quick Start

### Option A — Demo Mode (zero config, works offline)

Runs the entire app against an in-memory Supabase-shaped mock. No DB, no keys.

```bash
npm install
cp .env.example .env          # defaults to EXPO_PUBLIC_DEMO_MODE=true
npm run web                   # or: npx expo start (QR for Expo Go on device)
```

**Demo accounts** (password for all: `123456`):

| Role | Email | Notes |
|---|---|---|
| Customer | `demo@khidmat.app` | Ali Raza, Lahore |
| Provider | `bilal@khidmat.app` | Bilal Ahmed (Electrician, Gold tier) |
| Admin | `admin@khidmat.app` | Khidmat Ops — unlocks `/admin` console |

Pending-KYC provider (Nadia Karim) sits in the verification queue so you can exercise approve / reject + the audit trail.

### Option B — Real Supabase backend

1. Provision a Supabase project, copy URL + anon key into `.env`.
2. Set `EXPO_PUBLIC_DEMO_MODE=false`.
3. Apply migrations `0001 → 0008`:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
4. Bootstrap your admin account (run once in the SQL editor):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
5. Optional — start `agent-server/` for AI + payment proxy:
   ```bash
   cd agent-server
   npm install
   cp .env.example .env      # set GEMINI_API_KEY (or OPENAI_API_KEY), SUPABASE_JWT_SECRET
   npm run dev               # http://localhost:8787
   ```

---

## Environment Variables

### Mobile app (`.env` at repo root)

| Variable | Purpose | Default |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | — (required when `DEMO_MODE=false`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | — (required when `DEMO_MODE=false`) |
| `EXPO_PUBLIC_DEMO_MODE` | Use in-memory mock instead of network | `true` |
| `EXPO_PUBLIC_AGENT_SERVER_URL` | AI/payments proxy URL | `http://localhost:8787` |
| `EXPO_PUBLIC_EMAIL_ENABLED` | Email-based invites | `false` |
| `EXPO_PUBLIC_PHONE_AUTH_ENABLED` | Twilio SMS OTP sign-in (needs Twilio creds in Supabase) | `false` |
| `EXPO_PUBLIC_PAYMENTS_ENABLED` | Wallet payments (needs `PAYMENTS_ENABLED=true` + merchant creds on `agent-server`) | `false` |
| `EXPO_PUBLIC_BG_LOCATION_ENABLED` | Background provider tracking during `in_progress` jobs | `false` |
| `EXPO_PUBLIC_POSTHOG_KEY` | Product analytics (leave empty for strict no-op) | — |

### Agent server (`agent-server/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Server port (default `8787`) | No |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | AI provider credential | Yes for `/api/heal` |
| `SUPABASE_JWT_SECRET` | Verifies Bearer tokens from the mobile client | Yes for authenticated routes |
| `ALLOWED_ORIGINS` | CORS allow-list (comma-separated) | Recommended for prod |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Global limiter config | No |
| `PAYMENTS_ENABLED` | Flip wallet flow on/off | No (`false` default) |
| `GW_MOBILE_ACCOUNT`, `GW_MERCHANT_KEY`, `GW_MERCHANT_ID`, `GW_VERSION_NUMBER`, `GW_PASSWORD_SALT`, `GW_TXN_TYPE`, `GW_RETURN_URL` | JazzCash / EasyPaisa merchant creds | Yes when payments enabled |

> Real `.env` files are gitignored. Never commit `SUPABASE_SERVICE_ROLE_KEY` or gateway merchant secrets.

---

## Supabase Schema & Migrations

Migrations live in `supabase/migrations/`. All applied **locally to demo seed** — real project needs `npx supabase db push`:

| # | File | What it does |
|---|---|---|
| 0001 | `0001_init.sql` | Base schema: profiles, providers, categories, bookings, messages, reviews, provider_locations, push_tokens; RLS on every table; `handle_new_user()` signup trigger |
| 0002 | `0002_legacy_bridge.sql` | `bookings.meta JSONB`, `profiles.current_mode`, `notifications` table, avatars storage bucket, extra booking statuses (`confirmed`, `closed`) |
| 0003 | `0003_phase3_features.sql` | `profiles.verification_status`, `payments` table, `job_media` bucket, hardened notifications |
| 0004 | `0004_chat_push.sql` | Chat thread participant policies, `push_tokens` booking-partner reads |
| 0005 | `0005_chat_seen_receipts.sql` | `messages.seen_at` + participant-scope update policy |
| 0006 | `0006_saved_addresses.sql` | `saved_addresses` table (owner-scoped) |
| 0007 | `0007_admin_moderation.sql` | `admin` enum value, `reviews.is_hidden`, `is_admin()` SECURITY DEFINER helper, admin-only UPDATE/DELETE policies |
| 0008 | `0008_security_hardening.sql` | **PII split** (`profile_contacts`), notifications INSERT scoped, job-media private, `admin_actions` audit table, signup trigger re-pointed |

Full change log lives in [changes.md](changes.md).

---

## Security Posture

Audited against Play Store launch standards. Highlights:

- **Postgres RLS default-deny** on every table; every policy narrows access (self / admin / booking counterparty) — never `USING (true)` for sensitive rows.
- **PII split**: `phone` moved into `profile_contacts` table with owner/admin/counterparty-only SELECT; provider browse never leaks a number until a booking exists.
- **Append-only admin audit trail** for moderation mutations (who, what, when).
- **AI / LLM endpoints** (`/api/heal`, `/api/gemini/generateContent`) require a valid Supabase Bearer token.
- **Helmet + CORS allowlist + `express-rate-limit` + Zod body validation + 1 MB JSON cap** on `agent-server`.
- **Session storage**: `expo-secure-store` (Keychain / Keystore) on native; `sessionStorage` on web (tab-scoped, XSS blast radius minimized).
- **Secrets hygiene**: `.env`, `agent-server/.env`, and `supabase/.temp` gitignored; merchant credentials live only on `agent-server`.

Remaining items are listed in [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) §5.

---

## Development Commands

```bash
npm run web                 # Metro dev server (browser)
npx expo start              # Expo Go QR for physical device
npx tsc --noEmit            # Type check (0 errors expected)
npm run lint                # ESLint (0 errors expected; pre-existing prettier warnings OK)
npm test                    # Jest: 25 tests / 6 suites
npx jest src/services/supabase/__tests__   # Only the Supabase integration + admin tests
```

---

## Play Store Launch Status

| Area | State |
|---|---|
| Feature surface (customer / provider / admin) | ✅ Demo-ready |
| Legal screens (privacy / terms / safety) | ✅ Shipped |
| Admin console (verification queue + moderation + audit log) | ✅ Shipped |
| Database migrations (`0002 → 0008`) | ⚙️ **Needs `db push` on live Supabase** |
| RLS / PII split / notifications forge-resistance | ✅ Cutover with 0008 |
| Payments | 💰 Stubbed (needs merchant credentials; COD-only ships today) |
| SMS OTP | 💰 Stubbed (needs Twilio in Supabase Auth) |
| Push notifications | ✅ Wired for native via `push.ts` |
| Analytics | 💰 Free PostHog signup available (optional) |
| Data-safety form + $25 Google Play developer account | ⚙️ Owner action |
| Full Urdu content rollout + wired light/dark toggle | 🗺️ Roadmap |
| Component / e2e test coverage | 🗺️ Roadmap |

See [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) for the cutover runbook.

---

## Architecture

```
khidmat_app-main/
├── app/                  # Expo Router screens & stacks
│   ├── (auth)/           # Login / signup / password reset
│   ├── (booking)/        # Booking form, matching, live tracking
│   ├── (tabs)/           # Home, Bookings, Inbox, Notifications, Profile
│   ├── admin.tsx         # Admin console (role-gated)
│   ├── privacy.tsx       # Legal screen
│   ├── terms.tsx         # Legal screen
│   └── safety.tsx        # Legal screen
├── src/
│   ├── components/       # features / layout / ui
│   ├── context/          # AuthContext, providers
│   ├── hooks/            # useDebounce, useSupabase, etc.
│   ├── services/
│   │   ├── supabase/     # client, queries, legacy, mockClient
│   │   ├── api/          # agentClient (heal + errors)
│   │   ├── payments.ts   # Feature-flagged client wrapper
│   │   ├── push.ts       # Expo push registration + send
│   │   └── analytics.ts  # PostHog wrapper (no-op when key empty)
│   ├── theme/            # global.css, tailwind bridge, colors.ts (BRAND)
│   ├── i18n/             # en.json, ur.json, index.ts, t()
│   ├── types/            # database.types.ts (Supabase codegen), models.ts
│   └── utils/            # geolocation, ratings, eventEmitter
├── agent-server/         # Express proxy: /heal, /gemini/*, /payments/*
├── supabase/
│   ├── migrations/       # 0001 → 0008
│   └── seed.sql
├── docs/                 # ARCHITECTURE, SETUP, LAUNCH_CHECKLIST, web_errors
└── changes.md            # Running changelog (Sections 1 → 16)
```

---

## Repository

**Remote**: `https://github.com/Muhammad08-dot/khidmat_app-main.git`

---

## Contribution Notes

- Every user-visible change must be logged in `changes.md` under a new section heading.
- Reusable UI primitives live under `src/components/ui/`; feature-level composites under `src/components/features/`.
- Colors used in imperative props (`Icon`, `ActivityIndicator`, `RefreshControl`, SVG) reference `BRAND.*` from `src/theme/colors.ts` — no raw hex in TS/TSX except in the theme file itself.
- Tailwind semantic tokens (`success / danger / warning / caution / info / muted`) are the only allowed status colors on class-based styling.
- Supabase queries stay in `src/services/supabase/`; screens should not import `supabase` directly.
