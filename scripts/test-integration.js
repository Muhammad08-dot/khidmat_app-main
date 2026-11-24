#!/usr/bin/env node
/**
 * scripts/test-integration.js
 * Runner for Cloud Supabase Integration Tests.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const jestBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'jest.cmd' : 'jest'
);
const config = path.join(rootDir, 'jest.integration.config.js');

console.log('🧪 Starting Cloud Supabase Integration Tests against khidmat-test...\n');

const envTestPath = path.join(rootDir, '.env.test');
const hasEnvTest = fs.existsSync(envTestPath);
const hasKeys = Boolean(process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_SERVICE_ROLE_KEY);

if (!hasEnvTest && !hasKeys) {
  console.log('⚠️  [INTEGRATION TESTS: NOT RUN] Test credentials missing in .env.test.');
  console.log('   All 4 integration test suites will be reported as SKIPPED / NOT RUN.\n');
}

const result = spawnSync(jestBin, ['--config', config, '--runInBand'], {
  cwd: rootDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 0);
