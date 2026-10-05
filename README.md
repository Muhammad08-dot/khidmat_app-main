# Khidmat — On-Demand Home Services Platform (Mobile)

Khidmat is an enterprise-level services marketplace connecting customers with local workers (electricians, plumbers, carpenters, etc.) across Pakistan. Built strictly as a mobile-first platform using Expo Router and React Native, it features AI-powered intent parsing, intelligent provider matching, real-time chat, live tracking, and an independent proxy agent-server for ultimate API security.

## Architecture

The platform uses a robust 10/10 MVP architectural separation:

```
khidmat_app-main/
├── app/                  # Expo Router screens & navigation stacks
├── src/                  # Core frontend logic (components, context, UI kit, models)
├── agent-server/         # AI microservice (Express proxy & LangChain)
├── docs/                 # Documentation (Architecture, Setup, Errors)
└── assets/               # Static mobile assets (icons, splashes)
```

## Prerequisites

- **Node.js >= 20**
- **npm** (package manager)
- **Expo CLI** (`npm install -g expo-cli`) — for mobile development
- Firebase project (optional — app runs with a fully functional mock/local fallback)
- Google Gemini API key (Required on `agent-server` only — app falls back to local parsing if offline)

## Quick Start

### 1. Agent Server (Backend AI Proxy)
The agent server securely proxies all AI requests (Gemini) so your API keys never leak into the mobile bundle.

```bash
cd agent-server
npm install
cp .env.example .env          # Copy and insert your GEMINI_API_KEY
npm run dev                   # Starts the development proxy server at http://localhost:8787
```

### 2. Mobile App (Expo Frontend)
Ensure the `agent-server` is running before starting the mobile app for full AI capabilities.

```bash
# From project root
npm install
cp .env.example .env          # Copy and optionally fill in Firebase keys
npx expo start -c             # Starts Expo Bundler and clears cache
```
Scan the QR code with **Expo Go** on your physical mobile device.

## Environment Variables

### Mobile App (`.env` in project root)

| Variable | Purpose | Required |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase auth/firestore key | No (mock fallback) |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | No |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | No |
| `EXPO_PUBLIC_AGENT_SERVER_URL` | Agent server URL (e.g. `http://localhost:8787`) | No |

*(Note: `EXPO_PUBLIC_GEMINI_API_KEY` has been strictly removed from the frontend for security. AI functions are routed entirely through the `agent-server` proxy.)*

### Agent Server (`agent-server/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Server port (default: `8787`) | No |
| `GEMINI_API_KEY` | Google Gemini AI Key | Yes (for AI features) |
| `ALLOWED_ORIGINS` | CORS origins | No |

## Development Hygiene
- **UI Kit**: All reusable components (Cards, Buttons, Avatars, Skeletons) are strictly located in `src/components/ui/`.
- **RTL Ready**: The layout is pre-configured with `I18nManager.allowRTL(true)` for full Urdu language support compatibility.
- **Type Safety**: Core models and types reside in `src/types/models.ts`.
