# Setup & Local Development Guide — Khidmat v2.0.0

## Prerequisites

- **Node.js**: v20 or newer
- **npm**: v10 or newer
- **Docker Desktop** (optional, required only for running local Supabase emulator)
- **Expo Go** or native development build on physical Android phone / emulator

---

## 1. Environment Configuration

### Root `.env` (Mobile App)

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

| Variable                          | Description                             | Default / Example                          |
| :-------------------------------- | :-------------------------------------- | :----------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`        | Supabase API endpoint URL               | `https://sodxwchaqpqnwvnrnsaj.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`   | Public anon/publishable key             | `sb_publishable_...`                       |
| `EXPO_PUBLIC_USE_MOCK`            | Enable in-memory mock client (dev only) | `false`                                    |
| `EXPO_PUBLIC_ENABLE_DEMO`         | Show 1-Tap Demo Login button (dev only) | `false`                                    |
| `EXPO_PUBLIC_AGENT_SERVER_URL`    | Agent server endpoint                   | `http://localhost:8787`                    |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (optional)          | `""`                                       |
| `EXPO_PUBLIC_PHONE_AUTH_ENABLED`  | Phone SMS OTP flag                      | `false`                                    |
| `EXPO_PUBLIC_BG_LOCATION_ENABLED` | Background GPS tracking flag            | `false`                                    |

---

## 2. Local Supabase Backend (Optional / Docker)

Khidmat includes a fully configured local Supabase setup in `supabase/`:

- Configuration file: `supabase/config.toml`
- Schema Migrations: `supabase/migrations/0001` through `0012`
- Seed Data: `supabase/seed.sql`

### Booting Local Supabase from Scratch:

```bash
# 1. Start Docker Desktop on your machine
# 2. Boot local Supabase containers:
npx supabase start

# 3. Apply all migrations (0001..0012) and seed data:
npx supabase db reset
```

Local service ports:

- **API URL:** `http://localhost:54321`
- **Postgres DB:** `postgresql://postgres:postgres@localhost:54322/postgres`
- **Studio Dashboard:** `http://localhost:54324`
- **InBucket Email Sandbox:** `http://localhost:54325`

---

## 3. Running the Agent Server

The Agent Server powers AI intent parsing, pricing suggestions, and provider ranking:

```bash
cd agent-server
npm install
npm run dev
```

Runs on `http://localhost:8787`.

---

## 4. Running the Mobile App

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

- Press **`a`** to launch Android emulator.
- Press **`w`** to launch Web browser preview.
- Or scan QR code with Expo Go on your physical Android phone.

---

## 5. Verification & Test Commands

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Linter
npm run lint

# 3. Unit & Integration Tests with Coverage
npx jest --coverage

# 4. Expo Health Check
npx expo-doctor
```

All four checks must exit with code 0.
