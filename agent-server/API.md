# Khidmat Agent Server — API Contract & Environment Specification

> **Default port:** `8787` (configurable via `PORT` env var in `agent-server/.env`)  
> **Base URL (local):** `http://localhost:8787`

This document is the authoritative contract for the Khidmat self-healing agent server. It is consumed by Agent 1 (UI), Agent 2 (Hardening), and project developers. Any client calling these endpoints must conform to the shapes below.

---

## 1. Environment Variables Specification

The agent server is configured via environment variables. In local development, create `agent-server/.env` based on `.env.example`.

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `8787` | Port the Express server listens on. |
| `ALLOWED_ORIGINS` | No | `http://localhost:8081,exp://localhost:8081` | Comma-separated list of allowed CORS origins. |
| `SUPABASE_JWT_SECRET` | **Yes** | — | Supabase JWT signing secret. Used to verify bearer tokens on protected endpoints. |
| `SUPABASE_JWT_AUDIENCE` | No | `authenticated` | Expected audience (`aud`) claim in incoming user JWTs. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limiting sliding window duration in milliseconds (1 minute). |
| `RATE_LIMIT_MAX_REQUESTS` | No | `60` | Maximum requests allowed per IP address within the sliding window. |
| `GEMINI_API_KEY` | No | — | Google Gemini API key for intent parsing and LLM diagnostics. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model identifier used for content generation. |
| `OPENAI_API_KEY` | No | — | OpenAI API key fallback for LLM operations. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model identifier. |
| `PAYMENTS_ENABLED` | No | `false` | Feature toggle for mobile wallet transaction initiation. |
| `GW_MOBILE_ACCOUNT` | When payments enabled | — | Merchant mobile account identifier for JazzCash/EasyPaisa. |
| `GW_MERCHANT_KEY` | When payments enabled | — | Merchant secret key used to compute HMAC SHA-512 order signatures. |
| `GW_MERCHANT_ID` | When payments enabled | — | Merchant ID issued by payment gateway. |
| `GW_PASSWORD_SALT` | When payments enabled | — | Merchant transaction password salt. |
| `GW_RETURN_URL` | No | `khidmat://payments/callback` | Deep-link callback URL after payment gateway completion. |

---

## 2. Authentication & Security Middleware

All endpoints under `/api/*` (except health and payments config) require a valid Supabase JWT Bearer token:
```http
Authorization: Bearer <SUPABASE_JWT>
```
The token is verified using `jsonwebtoken` against `SUPABASE_JWT_SECRET` and strictly enforces:
- Expiration: Expired tokens reject with `401 Token expired`.
- Audience: Audience claim must match `SUPABASE_JWT_AUDIENCE` (`authenticated`). Wrong audience rejects with `401 Invalid token`.
- Signature: Unsigned or tampered tokens reject with `401 Invalid token`.

### CORS Protection
Cross-Origin Resource Sharing is strictly constrained to `ALLOWED_ORIGINS`. Preflight and request headers from unauthorized origins are rejected.

### Rate Limiting
Global sliding-window rate limiting throttles abusive traffic. Requests exceeding `RATE_LIMIT_MAX_REQUESTS` receive HTTP `429 Too Many Requests`.

---

## 3. Endpoints

### `GET /health` & `GET /api/health` — Liveness & Readiness Probes
No request body or authentication required.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "hasLLM": true,
  "timestamp": "2026-11-24T12:00:00.000Z"
}
```

---

### `POST /api/heal` — Self-Healing Diagnostic
Requires JWT Authentication (`Bearer`).

**Request body (`application/json`)**:
```json
{
  "message": "Cannot read property 'map' of undefined",
  "stack": "at Home.render (src/pages/Home.tsx:42:15)",
  "componentStack": "at Home (created by RootLayout)",
  "file": "src/components/features/CustomerHome.tsx",
  "codeSnippet": "providers.map(p => ...)",
  "appContext": "customer home screen, after booking",
  "platform": "react-native",
  "timestamp": "2026-11-24T12:00:00.000Z"
}
```

**Success response `200 OK`**:
```json
{
  "diagnosis": "Root cause analysis from AI or diagnostics engine.",
  "suggestion": "Actionable code modification recommendation.",
  "proposedPatch": "TypeScript/JSX patch snippet, or null.",
  "confidence": 0.9,
  "model": "gemini-2.5-flash",
  "timestamp": "2026-11-24T12:00:00.000Z"
}
```

---

### `POST /api/gemini/generateContent` — Secure Gemini Proxy
Requires JWT Authentication (`Bearer`). Used for intent parsing and specialized provider matching.

**Request body (`application/json`)**:
```json
{
  "model": "gemini-2.5-flash",
  "contents": [
    {
      "parts": [{ "text": "Analyze service category" }]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json"
  }
}
```

---

### `POST /api/payments/initiate` — Mobile Wallet Transaction Initiation
Requires JWT Authentication (`Bearer`). Protected by server-side HMAC SHA-512 signing.

**Request body (`application/json`)**:
```json
{
  "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 2500,
  "method": "jazzcash"
}
```
