#!/usr/bin/env node
/**
 * Environment switcher for Expo app env files (M4-3).
 * Usage: node scripts/use-env.js test|prod
 * Copies .env.app.test or .env.app.prod -> .env.local (never commits secrets).
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (target !== 'test' && target !== 'prod') {
  console.error('Usage: node scripts/use-env.js <test|prod>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const srcFile = path.join(root, `.env.app.${target}`);
const destFile = path.join(root, '.env.local');

if (!fs.existsSync(srcFile)) {
  console.error(
    `Missing ${path.basename(srcFile)}. Create it with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.`
  );
  process.exit(1);
}

fs.copyFileSync(srcFile, destFile);
console.log(`✅ Switched .env.local -> .env.app.${target}`);
