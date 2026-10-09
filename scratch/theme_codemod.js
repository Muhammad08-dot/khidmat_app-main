/*
 * One-off codemod: enforce theme discipline.
 *  1. Map scattered semantic status hexes -> BRAND.* tokens (imperative props & JS strings).
 *  2. Convert SOLID `bg-white` class -> `bg-surface-raised` (theme-aware); leave translucent `bg-white/NN`.
 * Dry run by default; pass --write to apply. Run: node scratch/theme_codemod.js [--write]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app", "src"];
const SKIP = [path.join(ROOT, "src", "theme", "colors.ts")];
const WRITE = process.argv.includes("--write");
const IMPORT_LINE = 'import { BRAND } from "@/src/theme/colors";';

// 6-digit hex (uppercase) -> BRAND key. Values equal the old hardcode (colour-preserving).
const HEX2TOKEN = {
  "059669": "success",
  "EF4444": "danger",
  "F59E0B": "warning",
  "C2410C": "caution",
  "64748B": "muted",
  "4A7FA0": "info",
  "B8863B": "gold",
  "E4E2D8": "border",
  // Second pass: fold near-duplicate status hues into the semantic set.
  "14231C": "ink",      // exact (was the ink token hardcoded)
  "10B981": "success",  // chat 'confirmed' / map route -> standard success green
  "3B82F6": "info",     // chat 'completed' -> standard info blue
  "2C6E8F": "info",     // bookings 'completed' -> standard info blue
  "0369A1": "info",     // chat info chip -> standard info blue
  "F97316": "caution",  // chat 'pending' -> standard caution orange
  "D97706": "warning",  // alert amber -> standard warning
  "1F6B52": "primary",  // not-found service icons: stray brand-green -> primary
  "DC2626": "danger",   // matching alert red -> standard danger
  "6B7280": "muted",    // grey icon -> standard muted
};

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".expo" || name === "dist") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// Build "#RRGGBB" or "#RRGGBBAA" -> BRAND.expr given the token+alpha.
function brandExpr(token, alpha) {
  return alpha ? `BRAND.${token} + "${alpha}"` : `BRAND.${token}`;
}

const files = [];
for (const d of DIRS) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, files);
}

let changed = 0, hexHits = 0, bgHits = 0;
for (const f of files) {
  if (SKIP.includes(path.resolve(f))) continue;
  const before = fs.readFileSync(f, "utf8");
  let after = before;

  // (1a) JSX attributes: word="#HEX[AA]" -> word={BRAND.t (+ "AA")}
  after = after.replace(/(\w+)="#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?"/g, (m, attr, hex, alpha) => {
    const tok = HEX2TOKEN[hex.toUpperCase()];
    if (!tok) return m;
    hexHits++;
    return `${attr}={${brandExpr(tok, alpha)}}`;
  });
  // (1b) Plain JS strings (objects, ternaries, arrays, styles): "#HEX[AA]"
  after = after.replace(/"#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?"/g, (m, hex, alpha) => {
    const tok = HEX2TOKEN[hex.toUpperCase()];
    if (!tok) return m;
    hexHits++;
    return brandExpr(tok, alpha);
  });

  // (2) Solid bg-white -> bg-surface-raised (skip bg-white/NN and bg-whiteX).
  after = after.replace(/bg-white(?![\/\w])/g, () => { bgHits++; return "bg-surface-raised"; });

  if (after === before) continue;

  if (after.includes("BRAND.") && !/from ["']@\/src\/theme\/colors["']/.test(after)) {
    const lines = after.split("\n");
    const idx = lines.findIndex((l) => /^import\b.*\bfrom\b.*["'];?\s*$/.test(l.trim()));
    if (idx >= 0) lines.splice(idx + 1, 0, IMPORT_LINE);
    else lines.unshift(IMPORT_LINE);
    after = lines.join("\n");
  }

  changed++;
  console.log(`  ${path.relative(ROOT, f)}`);
  if (WRITE) fs.writeFileSync(f, after, "utf8");
}

console.log(`\n${WRITE ? "Rewrote" : "Would rewrite"} ${changed} file(s). hex->token: ${hexHits}, bg-white->surface-raised: ${bgHits}.`);
if (!WRITE) console.log("Dry run — add --write to apply.");
