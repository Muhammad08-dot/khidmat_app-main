# Khidmat Agent Server — API Contract

> **Default port:** `8787` (configurable via `PORT` env var in `mobile/agent-server/.env`)
> **Base URL (local):** `http://localhost:8787`

This document is the authoritative contract for the Khidmat self-healing agent server. It is consumed by Agent 1 (web), Agent 2 (mobile), and Agent 3 (QA). Any client that calls these endpoints must conform to the shapes below.

## Overview

The agent server (`mobile/agent-server/`) is an Express microservice that receives client crash reports from the Khidmat mobile app and returns an AI-generated diagnosis, suggested fix, and optional code patch. It uses LangChain with either OpenAI or Google Gemini (dynamic imports) when an API key is configured. Without keys it returns a deterministic stub response (so the server always boots and always responds).

CORS is enabled for all origins. Body limit is 512 KB (`express.json({ limit: "512kb" })`).

## Endpoints

### `GET /api/health` — Liveness probe

No request body.

**Response** `200 OK`:
```json
{
  "status": "ok",
  "hasLLM": true,
  "timestamp": "2026-09-02T12:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `status` | string | Always `"ok"` when the server is up |
| `hasLLM` | boolean | `true` if `OPENAI_API_KEY` or `GEMINI_API_KEY` is set; `false` in stub mode |
| `timestamp` | string (ISO-8601) | Server time of the response |

### `POST /api/heal` — Submit a crash report, get a fix suggestion

**Request body** (`application/json`):
```json
{
  "message": "Cannot read property 'map' of undefined",
  "stack": "at Home.render (src/pages/Home.tsx:42:15)",
  "componentStack": "at Home (created by RootLayout)",
  "file": "src/components/features/CustomerHome.tsx",
  "codeSnippet": "providers.map(p => ...)",
  "appContext": "customer home screen, after booking",
  "platform": "react-native",
  "timestamp": "2026-09-02T12:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | **Yes** | The error message. Missing → `400` |
| `stack` | string | No | JS stack trace |
| `componentStack` | string | No | React component stack |
| `file` | string | No | Source file the error originated in |
| `codeSnippet` | string | No | Relevant code snippet |
| `appContext` | string | No | High-level app state context |
| `platform` | string | No | `"react-native"` (dynamically set by mobile client) |
| `timestamp` | string (ISO-8601) | No | When the crash was captured |

**Success response** `200 OK`:
```json
{
  "diagnosis": "A one-paragraph root-cause analysis.",
  "suggestion": "A short actionable fix description.",
  "proposedPatch": "TypeScript/JSX code patch, or null if unclear.",
  "confidence": 0.85,
  "model": "gpt-4o-mini",
  "timestamp": "2026-09-02T12:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `diagnosis` | string | Root-cause analysis from the LLM (or stub text if no key) |
| `suggestion` | string | Short actionable fix |
| `proposedPatch` | string \| null | Code patch snippet, or `null` |
| `confidence` | number (0–1) | Model confidence; `0` in stub mode |
| `model` | string | `"gpt-4o-mini"` (OpenAI), `"gemini-1.5-flash"` (Gemini), or `"stub"` |
| `timestamp` | string (ISO-8601) | Server time of the response |

**Error responses**:
- `400 Bad Request` — `{ "error": "Missing required field: message" }` if `message` is absent.
- `500 Internal Server Error` — `{ "error": "LLM invocation failed", "detail": "<message>" }` if the LLM call throws.

## Client Integration

The mobile client posts crash reports in `mobile/src/agent/errorReporter.ts` via:

```
POST {EXPO_PUBLIC_AGENT_ENDPOINT}
Content-Type: application/json
{
  "message": string,
  "stack"?: string,
  "componentStack"?: string,
  "platform": "react-native",
  "timestamp": ISO-string,
  "appVersion": string   // from EXPO_PUBLIC_APP_VERSION
}
```

Default endpoint value: `http://localhost:8787/api/heal` (set `EXPO_PUBLIC_AGENT_ENDPOINT` in `mobile/.env`).

## Environment Variables (agent-server)

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP listen port | `8787` |
| `OPENAI_API_KEY` | Enables OpenAI diagnosis (`gpt-4o-mini`) | *(empty)* |
| `GEMINI_API_KEY` | Enables Gemini diagnosis (`gemini-1.5-flash`) | *(empty)* |

If neither `OPENAI_API_KEY` nor `GEMINI_API_KEY` is set, the server responds in **stub mode** (`hasLLM: false`, `model: "stub"`, `confidence: 0`).

## Run

```bash
cd mobile/agent-server
npm install
cp .env.example .env   # set PORT / keys as needed
npm start              # tsx src/index.ts → http://localhost:8787
npm run dev            # tsx watch (auto-reload)
```
