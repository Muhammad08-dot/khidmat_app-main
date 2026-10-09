/*
 * One-off codemod: centralize the hardcoded brand hex (#1F5D3F) to BRAND.primary
 * from src/theme/colors.ts. Run: `node scratch/design_codemod.js`
 * Idempotent + dry-run by default; pass --write to apply.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app", "src"];
const SELF = path.join(ROOT, "src", "theme", "colors.ts");
const WRITE = process.argv.includes("--write");

const IMPORT_LINE = 'import { BRAND } from "@/src/theme/colors";\n';

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

const files = [];
for (const d of DIRS) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, files);
}

let changed = 0;
let totalHits = 0;
for (const f of files) {
  if (path.resolve(f) === SELF) continue;
  const before = fs.readFileSync(f, "utf8");
  if (!before.includes("1F5D3F")) continue;

  let after = before;
  // 1) JSX attributes: color="#1F5D3F"  ->  color={BRAND.primary}
  after = after.replace(/(\w+)="#1F5D3F"/g, "$1={BRAND.primary}");
  // 2) JSX attributes with 6-digit alpha: color="#1F5D3F66" -> color={BRAND.primary + "66"}
  after = after.replace(/(\w+)="#1F5D3F66"/g, '$1={BRAND.primary + "66"}');
  // 3) JS object/expression strings: : "#1F5D3F"  ->  : BRAND.primary
  after = after.replace(/:\s*"#1F5D3F"/g, ": BRAND.primary");

  if (after === before) {
    console.log("  (no transformable pattern) " + path.relative(ROOT, f));
    continue;
  }

  // Add import after the first top-level `import ...` line if BRAND is now used.
  if (after.includes("BRAND.") && !/from ["']@\/src\/theme\/colors["']/.test(after)) {
    const lines = after.split("\n");
    // Anchor on the first COMPLETE import line (one containing ` from "..."`),
    // never on a bare `import {` that opens a multi-line import.
    const idx = lines.findIndex((l) => /^import\b.*\bfrom\b.*["'];?\s*$/.test(l.trim()));
    if (idx >= 0) lines.splice(idx + 1, 0, IMPORT_LINE.trimEnd());
    else lines.unshift(IMPORT_LINE.trimEnd());
    after = lines.join("\n");
  }

  const hits = (before.match(/1F5D3F/g) || []).length;
  totalHits += hits;
  changed++;
  console.log(`  ${path.relative(ROOT, f)}  (${hits} hex)`);
  if (WRITE) fs.writeFileSync(f, after, "utf8");
}

console.log(`\n${WRITE ? "Rewrote" : "Would rewrite"} ${changed} file(s), ${totalHits} hex occurrence(s).`);
if (!WRITE) console.log("Dry run — add --write to apply.");
