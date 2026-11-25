#!/usr/bin/env node
/**
 * scripts/generate-migration-ledger.js
 * Generates the official migration ledger table from actual filesystem migration files.
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('| # | Migration File | Status | Description |');
console.log('| :--- | :--- | :---: | :--- |');

const descriptions = {
  '0001_init.sql': 'Core schema: profiles, services, bookings, reviews, and basic RLS',
  '0002_legacy_bridge.sql': 'Legacy schema compatibility views, columns, and bridge functions',
  '0003_phase3_features.sql': 'Storage buckets setup for avatars, media, and KYC assets',
  '0004_chat_push.sql': 'In-app chat messaging schema and message push notification hooks',
  '0005_chat_seen_receipts.sql': 'Realtime message delivery and read receipts support',
  '0006_saved_addresses.sql': 'Customer saved location addresses and coordinates',
  '0007_admin_moderation.sql': 'Admin role helper, provider verification, and moderation queues',
  '0008_security_hardening.sql': 'Enhanced security policies and cross-user read restrictions',
  '0009_booking_state_machine.sql': 'Atomic booking transition state machine and server-side transition guards',
  '0010_push_notifications_trigger.sql': 'Automated push notification dispatch triggers on status events',
  '0011_account_deletion.sql': 'Self-serve account deletion and data anonymization function',
  '0012_user_reports.sql': 'User reporting system and admin moderation resolution audit',
  '0013_kyc_and_security_hardening.sql': 'Private KYC bucket, signed URLs, owner/admin storage RLS, cascading cleanup',
  '0014_rls_hardening.sql': 'Anti-role escalation trigger, completion price lock, and append-only audit trail',
};

files.forEach((file, index) => {
  const num = file.split('_')[0];
  const isHardening = num === '0013' || num === '0014';
  const status = isHardening ? '**Active (Hardening)**' : 'Applied / Frozen';
  const desc = descriptions[file] || 'Database migration file';
  console.log(`| ${num} | \`${file}\` | ${status} | ${desc} |`);
});
