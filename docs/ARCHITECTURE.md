# Khidmat App Architecture

## Overview
Khidmat is a service marketplace mobile app designed to connect customers with local service providers in Pakistan. The platform leverages AI to parse user intents, rank providers, estimate job prices, and provide a self-healing error reporting system.

## System Components

### 1. Mobile Client (Expo / React Native)
- **Framework**: Expo SDK (React Native)
- **Routing**: Expo Router (File-based routing)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **State Management**: React Context (`AuthContext`) + TanStack React Query for server state
- **Storage**: `expo-secure-store` (native) / `window.localStorage` (web) for auth sessions

### 2. Agent Server (Node.js / Express)
- **Role**: A secure backend microservice acting as a proxy and LLM Orchestrator.
- **Responsibilities**:
  - **AI Proxying**: Securely routes requests to Google Gemini (hiding API keys from the client).
  - **Self-Healing Agent**: Receives crash reports from the mobile app and uses LangChain to diagnose root causes and suggest code patches.
- **Tech Stack**: Express, TypeScript, Zod, Helmet, Express-Rate-Limit, JWT, LangChain.

### 3. Backend (Supabase)
- **Authentication**: Supabase Auth (Email/Password), sessions persisted via `expo-secure-store` (native) / `localStorage` (web).
- **Database**: PostgreSQL (profiles, categories, providers, bookings, messages, provider_locations, reviews, push_tokens) with Row Level Security.
- **Realtime**: Supabase Realtime channels power live chat and booking status updates.
- **Storage**: Supabase Storage (Avatars, Job media).

---

## Directory Structure

```text
/
├── agent-server/           # Node.js backend for AI proxy & self-healing
├── app/                    # Expo Router pages (Screens & Layouts)
│   ├── (tabs)/             # Main bottom tabs (Home, Bookings, Inbox, Profile)
│   ├── auth.tsx            # Authentication flow
│   ├── booking.tsx         # Booking confirmation screen
│   └── ...                 # Other routes
├── src/                    # App source code
│   ├── components/         # Reusable UI elements (ui, features, layout)
│   ├── context/            # React Contexts (Auth)
│   ├── hooks/              # Custom React Hooks
│   ├── services/           # External API integrations
│   │   ├── api/            # Gemini proxy & Log service
│   │   └── supabase/       # Supabase client & typed queries
│   ├── theme/              # Typography & Tailwind global CSS
│   ├── types/              # Global TypeScript interfaces
│   └── utils/              # Helper functions (geolocation, location math)
```

## AI Agent Data Flow
1. **Customer Intent**: User types/speaks a problem (e.g., "My AC is leaking").
2. **Proxy Request**: Mobile app sends the string to `agent-server` via `POST /api/gemini/generateContent`.
3. **Gemini Processing**: Agent Server securely calls Google Gemini to parse the category ("AC Technician"), urgency ("high"), and summary.
4. **App Response**: Agent Server returns parsed JSON back to the mobile app to proceed with provider matching.
