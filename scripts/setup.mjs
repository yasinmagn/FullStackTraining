#!/usr/bin/env node
/**
 * setup.mjs - one-time bootstrap for the training repo.
 *
 *   npm run setup
 *
 * It does three small, safe things:
 *   1. checks your Node version,
 *   2. creates `.env` from `.env.example` if you don't have one yet,
 *   3. tells you what to edit next.
 *
 * It never prints or overwrites an existing `.env`.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(repoRoot, '.env');
const examplePath = join(repoRoot, '.env.example');

const MIN_NODE_MAJOR = 20;

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE_MAJOR) {
    console.error(`Node ${process.versions.node} is too old. Install Node ${MIN_NODE_MAJOR} LTS or newer.`);
    process.exit(1);
  }
  console.log(`OK  Node ${process.versions.node}`);
}

function ensureEnv() {
  if (existsSync(envPath)) {
    console.log('OK  .env already exists - leaving it untouched.');
    return false;
  }
  copyFileSync(examplePath, envPath);
  console.log('OK  created .env from .env.example');
  return true;
}

checkNode();
const created = ensureEnv();

console.log('\nNext steps');
console.log('----------');
if (created) {
  console.log('1. Open .env and set DATABASE_URL to your real PostgreSQL connection string.');
  console.log('2. Set JWT_SECRET to a long random value:');
  console.log('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
} else {
  console.log('1. Confirm DATABASE_URL and JWT_SECRET are set in .env.');
}
console.log('3. npm install            # installs every lesson workspace at once');
console.log('4. npm run db:setup       # create schema + seed data in your database');
console.log('5. npm run api            # start the final-project API on http://localhost:3000');
console.log('6. npm run web            # start the final-project UI on http://localhost:5173');
console.log('\nStart the lessons at docs/curriculum.md');
console.log('\nReminder: .env is git-ignored. Never commit real credentials.');
