/**
 * Khidmat Self-Healing Agent Server
 *
 * A LangChain-powered microservice that receives client crash reports from the
 * Khidmat mobile app and returns an AI-generated diagnosis, suggested fix, and
 * optional patch.
 *
 * Endpoints:
 *   POST /api/heal   — accept a crash payload → return fix suggestion
 *   GET  /api/health — liveness probe
 *
 * Run:  npm run dev   (tsx watch)
 *       npm run build && npm start
 */

import "dotenv/config";
import express from "express";
import cors from "cors";

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const hasLLM = !!(OPENAI_API_KEY || GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: "512kb" }));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  file?: string;
  codeSnippet?: string;
  appContext?: string;
  platform?: string;
  timestamp?: string;
}

interface HealResponse {
  diagnosis: string;
  suggestion: string;
  proposedPatch: string | null;
  confidence: number; // 0-1
  model: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// LLM chain (lazy-loaded so the server boots even without keys)
// ---------------------------------------------------------------------------
async function callLLM(payload: HealPayload): Promise<HealResponse> {
  const timestamp = new Date().toISOString();

  if (!hasLLM) {
    return {
      diagnosis:
        "No LLM API key configured. Configure OPENAI_API_KEY or GEMINI_API_KEY in the agent-server .env to enable AI-powered diagnosis.",
      suggestion:
        "This is a stub response. Add an API key and restart the server to get real suggestions.",
      proposedPatch: null,
      confidence: 0,
      model: "stub",
      timestamp,
    };
  }

  const prompt = buildPrompt(payload);

  // Dynamic import so the server boots without the SDK installed
  if (OPENAI_API_KEY) {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
      apiKey: OPENAI_API_KEY,
    });

    const res = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ]);

    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return parseLLMOutput(text, "gpt-4o-mini", timestamp);
  }

  if (GEMINI_API_KEY) {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0.2,
      apiKey: GEMINI_API_KEY,
    });

    const res = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ]);

    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    return parseLLMOutput(text, "gemini-1.5-flash", timestamp);
  }

  // Should never reach here due to hasLLM guard
  return {
    diagnosis: "Unexpected code path.",
    suggestion: "No LLM provider available.",
    proposedPatch: null,
    confidence: 0,
    model: "none",
    timestamp,
  };
}

// ---------------------------------------------------------------------------
// Prompt engineering
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a senior React Native / Expo engineer embedded in the Khidmat mobile app's self-healing pipeline.

When a crash report arrives, you:
1. Read the stack trace and error message carefully.
2. Identify the root cause — which file, which function, what condition triggered it.
3. Suggest a concrete fix (code patch when possible).
4. Rate your confidence 0.0–1.0.

Respond ONLY with valid JSON in this exact shape:
{
  "diagnosis": "<one-paragraph root-cause analysis>",
  "suggestion": "<short actionable fix description>",
  "proposedPatch": "<TypeScript/JSX code patch snippet, or null if unclear>",
  "confidence": <0.0–1.0>
}`;

function buildPrompt(payload: HealPayload): string {
  const parts: string[] = [];
  parts.push(`Error message: ${payload.message}`);
  if (payload.stack) parts.push(`Stack trace:\n${payload.stack}`);
  if (payload.componentStack) parts.push(`Component stack:\n${payload.componentStack}`);
  if (payload.file) parts.push(`File: ${payload.file}`);
  if (payload.codeSnippet) parts.push(`Code snippet:\n${payload.codeSnippet}`);
  if (payload.appContext) parts.push(`App context: ${payload.appContext}`);
  if (payload.platform) parts.push(`Platform: ${payload.platform}`);
  return parts.join("\n\n");
}

function parseLLMOutput(raw: string, model: string, timestamp: string): HealResponse {
  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const obj = JSON.parse(cleaned);
    return {
      diagnosis: obj.diagnosis ?? "Unable to parse diagnosis.",
      suggestion: obj.suggestion ?? "No suggestion available.",
      proposedPatch: obj.proposedPatch ?? null,
      confidence: typeof obj.confidence === "number" ? obj.confidence : 0.5,
      model,
      timestamp,
    };
  } catch {
    // LLM returned freeform text
    return {
      diagnosis: raw,
      suggestion: "See diagnosis for details.",
      proposedPatch: null,
      confidence: 0.3,
      model,
      timestamp,
    };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", hasLLM, timestamp: new Date().toISOString() });
});

app.post("/api/heal", async (req, res) => {
  const payload: HealPayload = req.body;
  if (!payload.message) {
    res.status(400).json({ error: "Missing required field: message" });
    return;
  }

  try {
    const result = await callLLM(payload);
    res.json(result);
  } catch (err: any) {
    console.error("[agent-server] LLM call failed:", err?.message ?? err);
    res.status(500).json({
      error: "LLM invocation failed",
      detail: String(err?.message ?? err),
    });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🤖 Khidmat Agent Server listening on http://localhost:${PORT}`);
  console.log(`   LLM available: ${hasLLM ? "yes" : "no (stub mode)"}`);
  console.log(`   POST /api/heal   — submit a crash report`);
  console.log(`   GET  /api/health — liveness probe\n`);
});