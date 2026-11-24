#!/usr/bin/env node
/**
 * scripts/secret-scan.js
 * Scans git-tracked files for leaked secrets, non-anon JWTs, and private key blocks.
 * Exit code 0 if clean, 1 if secret violations are found.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// File extensions to skip (binary/media/lockfiles/etc.)
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
  '.ttf', '.woff', '.woff2', '.otf', '.eot',
  '.pdf', '.zip', '.tar', '.gz', '.7z',
  '.sqlite', '.db'
]);

function getTrackedFiles() {
  try {
    const stdout = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf-8' });
    return stdout
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('Failed to get tracked files from git:', err.message);
    process.exit(1);
  }
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return [];

  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return [];

  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return [];
  }

  const violations = [];
  const lines = content.split(/\r?\n/);

  // 1. Check for private key blocks
  const privateKeyRegex = /-----BEGIN [A-Z0-9_-]*\s?PRIVATE KEY-----/i;

  // 2. Check for JWT tokens: eyJ...
  const jwtRegex = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b/g;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check private key
    if (privateKeyRegex.test(line)) {
      violations.push({
        file: filePath,
        line: lineNum,
        type: 'PRIVATE_KEY',
        message: 'Private key block detected',
      });
    }

    // Check JWTs
    let match;
    while ((match = jwtRegex.exec(line)) !== null) {
      const token = match[0];
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payloadJson = base64UrlDecode(parts[1]);
          const payload = JSON.parse(payloadJson);
          if (payload && payload.role && payload.role !== 'anon') {
            violations.push({
              file: filePath,
              line: lineNum,
              type: 'NON_ANON_JWT',
              message: `JWT token with unauthorized role "${payload.role}" detected (only anon role allowed in tracked files)`,
            });
          }
        } catch {
          // Ignore non-json tokens
        }
      }
    }
  });

  return violations;
}

function main() {
  console.log('🔍 Running Secret & Credential Scan on tracked files...');
  const files = getTrackedFiles();
  const allViolations = [];

  for (const file of files) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
  }

  if (allViolations.length > 0) {
    console.error(`\n❌ Secret scan FAILED with ${allViolations.length} violation(s):`);
    for (const v of allViolations) {
      console.error(`  - [${v.type}] ${v.file}:${v.line} -> ${v.message}`);
    }
    process.exit(1);
  }

  console.log(`✅ Secret scan PASSED: Scanned ${files.length} tracked files. No private keys or non-anon JWTs found.\n`);
  process.exit(0);
}

main();

