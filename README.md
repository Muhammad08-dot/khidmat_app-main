<p align="center">
  <img src="assets/icon.png" alt="Khidmat Logo" width="120" style="border-radius: 24px;" />
</p>

<h1 align="center">
  Khidmat · خدمت
</h1>

<p align="center">
  <b>Hyperlocal On-Demand Home Services Marketplace tailored for Pakistan.</b><br>
  Connecting customers with vetted local electricians, plumbers, carpenters, cleaners, and technicians.
</p>

<p align="center">
  <a href="https://github.com/Muhammad08-dot/khidmat_app-main/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/Muhammad08-dot/khidmat_app-main/ci.yml?style=flat-square&label=CI%20Pipeline&logo=github" alt="CI Pipeline" />
  </a>
  <a href="https://expo.dev">
    <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo" alt="Expo SDK 57" />
  </a>
  <a href="https://reactnative.dev">
    <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react" alt="React Native 0.86" />
  </a>
  <a href="https://supabase.com">
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL%2015-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  </a>
  <a href="docs/TEST_REPORT.md">
    <img src="https://img.shields.io/badge/Tests-38%2F38%20Passed-brightgreen?style=flat-square" alt="Tests Passed" />
  </a>
  <a href="docs/QA_AGENT_REPORT.md">
    <img src="https://img.shields.io/badge/E2E%20QA-30%2F30%20Verified-brightgreen?style=flat-square" alt="E2E QA" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License MIT" />
  </a>
</p>

<p align="center">
  <a href="#-features-by-role">Features</a> •
  <a href="#-engineering--architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-automated-testing--qa">Testing & QA</a> •
  <a href="#-docs--runbooks">Docs</a>
</p>

---

## 📱 Features by Role

### 👤 Customer Experience
* **AI-Powered Intent Discovery:** Natural search in Roman Urdu and English (e.g., *"kitchen pipe leaking"*) powered by Google Gemini 2.5 Flash with zero-latency local fallback.
* **Hyperlocal Provider Ranking:** Workers sorted dynamically by Haversine GPS distance, star ratings, and tier badges.
* **Transparent Pricing:** Base rates + distance-based travel fees displayed in PKR prior to confirmation.
* **Realtime Ephemeral Tracking:** Live worker GPS broadcast over WebSockets during active jobs.
* **In-App Messaging:** Realtime chat with quick-reply chips and read receipts.
* **Google Play Compliance:** In-app self-service account deletion and content/user abuse reporting.

### 🛠️ Provider (Worker) Hub
* **Worker Mode Switch:** Seamless single-tap toggle between Customer and Provider modes.
* **Availability Control:** Realtime Online/Offline status switch.
* **Race-Condition-Free Job Dispatch:** Accept/Reject requests with transparent base-fee and customer distance.
* **COD Settlement Confirmation:** Provider cash-collected toggle integrated with customer star ratings.
* **Public Profile & Portfolio:** Bio, hourly rates, verified credentials, and customer review ledger.

### 🛡️ Admin & Back-Office (`/admin`)
* **Role-Based Access Control:** Strict security gate restricting access to `role = 'admin'` users.
* **KYC Verification Queue:** Document and CNIC inspection queue with instant Approve/Reject triggers.
* **Content & Review Moderation:** Hide, unhide, or delete reviews with automatic provider rating re-computation.
* **Abuse & Harassment Reports:** Resolve or dismiss customer and provider abuse flags.
* **Append-Only Audit Trail:** Immutable `admin_actions` table tracking all administrative mutations.

---

## 🏗️ Engineering & Architecture

```
                  +----------------------------------------------+
                  |         Khidmat Client (Expo SDK 57)         |
                  |  Customer Flow  |  Provider Hub  |  Admin UI |
                  +----------------------------------------------+
                                   /            \
                Realtime WebSockets              REST / RPC
                                 /                \
                                v                  v
    +--------------------------------+      +-------------------------------+
    |        Supabase Backend        |      |       AI Agent Server         |
    |  * PostgreSQL 15 (RLS Enabled) |<---->|  * Express + Gemini 2.5 Flash |
    |  * Broadcast Channels (GPS)    |      |  * PII Regex Scrubber         |
    |  * Push Dispatcher (Deno EF)   |      |  * Audio Transcription Proxy  |
    +--------------------------------+      +-------------------------------+
```

### Key Engineering Innovations:
1. **Low-Overhead Live GPS Tracking:** Migrated continuous 6-second PostgreSQL write polling to Supabase Realtime **Broadcast Channels** (`tracking:{bookingId}`). Database write load dropped to near zero during active navigation.
2. **Atomic Booking State Machine:** Enforced mutual exclusion on status updates via conditional SQL (`UPDATE bookings SET status = $target WHERE id = $id AND status = $expected`) backed by PostgreSQL trigger `0009_booking_state_machine.sql`.
3. **Automated Push Dispatcher:** Deno Edge Function (`supabase/functions/push-dispatcher`) sends automated Expo push notifications on KYC updates, booking transitions, and offline chat messages.
4. **PII-Scrubbed Telemetry:** Client and server-side regex scrubbers redact Pakistani CNIC, mobile numbers, JWT tokens, and street addresses prior to error reporting or AI analysis.

---

## ⚡ Quick Start

### Option A: Zero-Config Demo Mode (Recommended)
Run the complete multi-role app locally with zero external accounts or API keys using the built-in in-memory mock client:

```bash
# 1. Clone repository
git clone https://github.com/Muhammad08-dot/khidmat_app-main.git
cd khidmat_app-main

# 2. Install dependencies
npm install

# 3. Start development server (defaults to EXPO_PUBLIC_DEMO_MODE=true)
npm run web
```

**Pre-seeded Demo Credentials** (Password for all: `123456`):
* **Customer:** `demo@khidmat.app` (Ali Raza, Lahore)
* **Provider:** `bilal@khidmat.app` (Bilal Ahmed, Electrician)
* **Admin:** `admin@khidmat.app` (Khidmat Operations)

---

### Option B: Real Supabase Backend

1. Create a project at [supabase.com](https://supabase.com).
2. Configure `.env` in repository root:
   ```env
   EXPO_PUBLIC_DEMO_MODE=false
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```
3. Apply all database migrations in 1 click by executing [`supabase/complete_setup.sql`](supabase/complete_setup.sql) in your **Supabase SQL Editor**, or use the CLI:
   ```bash
   npx supabase db push
   ```
4. Promote your user to admin in the Supabase SQL editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
   ```
5. *(Optional)* Start the AI Agent Server:
   ```bash
   cd agent-server && npm install && npm run dev
   ```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Runtime** | Expo SDK 57 · React Native 0.86 · React 19 |
| **Navigation** | Expo Router v57 (File-based typed routing) |
| **State & Cache** | TanStack React Query v5 + Zustand |
| **Styling & UI** | NativeWind v4 (Tailwind CSS, class-based dark mode) |
| **Backend & DB** | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions) |
| **Realtime Engine** | Supabase Realtime WebSockets Broadcast |
| **AI Proxy Server** | Node.js Express + Google Gemini 2.5 Flash |
| **Testing** | Jest + jest-expo + Headless Chrome Puppeteer E2E |

---

## 🧪 Automated Testing & QA

Continuous integration runs on every push and pull request via GitHub Actions.

```bash
# Run unit & integration test suites (10 suites / 38 tests)
npm test

# Run strict TypeScript compiler verification
npm run typecheck

# Run ESLint validation
npm run lint

# Run headless Chrome E2E browser test suite (30 user flows)
node scripts/e2e-qa-suite.mjs
```

### Verification Highlights:
* ✅ **38/38 Unit & Integration Tests Passing** (State machine, Haversine, broadcast tracking, PII scrubbers, i18n parity).
* ✅ **30/30 E2E Browser Flows Verified** with full visual screenshot artifacts in [`docs/qa-artifacts/`](docs/qa-artifacts/).
* ✅ **Zero TypeScript & ESLint Errors**.

---

## 📂 Repository Structure

```
khidmat_app-main/
├── app/                  # Expo Router screens (Auth, Tabs, Bookings, Admin, Legal)
│   ├── (auth)/           # Authentication screens & Google Sign-In
│   ├── (booking)/        # Booking creation, matching, and live tracking
│   ├── (tabs)/           # Customer & Provider navigation tabs
│   └── admin.tsx         # Role-gated Admin console
├── assets/               # Branding assets (App icons, splash screen, logo)
├── src/
│   ├── components/       # Reusable UI primitives & feature composites
│   ├── context/          # AuthContext (Supabase Auth & OAuth)
│   ├── services/         # Supabase client, queries, broadcast, error reporter
│   ├── theme/            # Semantic brand palette (BRAND) & global CSS
│   └── i18n/             # Synchronized bilingual dictionaries (en.json, ur.json)
├── agent-server/         # Express AI proxy server (Gemini 2.5 intent parsing)
├── supabase/
│   ├── migrations/       # Incremental SQL migrations (0001 -> 0012)
│   ├── complete_setup.sql# Single-file master database initialization script
│   └── functions/        # Push notification dispatcher (Deno Edge Function)
└── docs/                 # System architecture, test reports, and QA artifacts
```

---

## 📑 Documentation & Runbooks

* 📊 **[E2E QA Execution Report](docs/QA_AGENT_REPORT.md)** — Comprehensive 30-flow verification matrix and evidence.
* 🧪 **[Automated Test Report](docs/TEST_REPORT.md)** — Unit & integration test verification records.
* 📱 **[Manual Device Test Checklist](docs/MANUAL_TESTS.md)** — Low-end device, slow network, and RTL test procedures.
* 🏛️ **[System Architecture Guide](docs/ARCHITECTURE.md)** — Deep dive into state machines and push triggers.
* 🚀 **[Play Store Launch Checklist](docs/LAUNCH_CHECKLIST.md)** — Pre-launch compliance and deployment runbook.
* 📝 **[Changelog](CHANGELOG.md)** — Chronological engineering modifications and fixes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
