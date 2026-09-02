# Khidmat — On-Demand Home Services Platform

> **Note:** The web version is currently undergoing fixes, but the mobile app version (in the `mobile/` directory) is fully functional and running perfectly.

Khidmat is a services marketplace connecting customers with local workers (electricians, plumbers, carpenters, etc.) across Pakistan. It features AI-powered intent parsing, provider matching, real-time chat, live tracking, and a self-healing agent server.

## Architecture

```
khidmat_web_app-main/
├── src/                  # Web frontend (React + Vite + Tailwind CSS v4)
├── mobile/               # Mobile app (Expo Router + React Native)
│   ├── app/              # Expo Router screens
│   ├── src/              # Shared RN modules, hooks, components
│   └── agent-server/     # Self-healing agent microservice (Express + LangChain)
└── public/               # Web static assets
```

## Prerequisites

- **Node.js >= 20**
- **npm** (package manager)
- **Expo CLI** (`npm install -g expo-cli`) — for mobile development
- Firebase project (optional — app runs with mock/local fallback)
- Google Gemini API key (optional — app falls back to local parsing)
- Google Maps API key (optional — for map features)

## Quick Start

### 1. Web Frontend

```bash
# From project root
npm install
cp .env.example .env          # Copy and fill in your API keys
npm run dev                   # Starts Vite dev server at http://localhost:5173
```

Build for production:
```bash
npm run build                 # Output in dist/
npm run preview               # Preview production build
```

### 2. Mobile App (Expo)

```bash
cd mobile
npm install
cp .env.example .env          # Copy and fill in your API keys
npx expo start                # Opens Expo DevTools, scan QR with Expo Go
```

### 3. Agent Server

```bash
cd mobile/agent-server
npm install
cp .env.example .env          # Copy and fill in your API keys
npm start                     # Production mode
npm run dev                   # Development mode (tsx watch)
```

The agent server starts at `http://localhost:8787` by default.

## Environment Variables

### Web Frontend (`.env` in project root)

| Variable | Purpose | Required |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase auth/firestore key | No (mock fallback) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | No |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | No |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | No |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | No |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | No |
| `VITE_GEMINI_API_KEY` | Google Gemini AI for intent parsing, provider matching, pricing | No (local fallback) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API | No (map selector disabled) |

### Mobile App (`.env` in `mobile/`)

| Variable | Purpose | Required |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase auth/firestore key | No (mock fallback) |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | No |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | No |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | No |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | No |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | No |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini AI | No (local fallback) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps for React Native | No (SVG fallback) |
| `EXPO_PUBLIC_AGENT_ENDPOINT` | Agent server URL (e.g. `http://localhost:8787/api/heal`) | No |
| `EXPO_PUBLIC_APP_VERSION` | App version for crash reports | No |

### Agent Server (`mobile/agent-server/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Server port (default: `8787`) | No |
| `OPENAI_API_KEY` | OpenAI API for LLM-powered crash diagnosis | No (stub mode) |
| `GEMINI_API_KEY` | Google Gemini API for LLM-powered crash diagnosis | No (stub mode) |

> **Note:** At least one of `OPENAI_API_KEY` or `GEMINI_API_KEY` should be set for the agent server to provide real AI-powered crash diagnosis. Without either, it returns stub responses.

## API Endpoints (Agent Server)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness probe — returns `{ status: "ok", hasLLM, timestamp }` |
| `POST` | `/api/heal` | Submit a crash payload — returns AI diagnosis, suggestion, and proposed patch |

## Troubleshooting

| Issue | Solution |
|---|---|
| `npm run dev` fails with module errors | Run `npm install` first. Ensure Node.js >= 20. |
| Firebase not connecting | Set `VITE_FIREBASE_*` variables in `.env`. App works with mock/local storage when keys are missing. |
| Gemini AI not working | Set `VITE_GEMINI_API_KEY`. App falls back to local keyword-based parsing when key is missing. |
| Maps not showing | Set `VITE_GOOGLE_MAPS_API_KEY`. Map components are disabled without a valid key. |
| Expo app won't start in Expo Go | Run `cd mobile && npm install` then `npx expo start`. If it still doesn't run on Expo Go, press `w` in the terminal to view the mobile app preview directly in your browser. |
| Agent server returns stub responses | Set `OPENAI_API_KEY` or `GEMINI_API_KEY` in `mobile/agent-server/.env`. |
| Port 8787 already in use | Set `PORT` in `mobile/agent-server/.env` to a different port. |
| Tailwind classes not applying | Ensure `tailwind.config.js` exists at project root (referenced by `src/index.css`). |
