#!/usr/bin/env node
/**
 * check-secrets.mjs
 *
 * A cheap, dependency-free guard that fails if anything that looks like a real
 * credential is about to be committed.
 *
 * It is deliberately conservative: it only scans files git knows about (tracked
 * or untracked-but-not-ignored), so anything in .gitignore - including your
 * real `.env` - is never read.
 *
 *   npm run check:secrets
 *
 * See docs/00-setup.md ("Optional: pre-commit hook") to wire it into git.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Files that legitimately contain placeholder-shaped text. */
const IGNORED = [/^\.env\.example$/, /^scripts\/check-secrets\.mjs$/, /(^|\/)package-lock\.json$/];

/** Binary-ish or generated files; scanning them is noise. */
const SKIP_EXT = /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|pdf|zip|gz|lock)$/i;

/**
 * Words that mark a match as an obvious placeholder rather than a real secret.
 *
 * Kept deliberately narrow. Every entry here is a hole in the scanner, so add
 * one only when a class of false positive is genuinely unavoidable - and prefer
 * the `check-secrets:allow` marker below for one-off cases.
 */
const PLACEHOLDER =
  /(your[-_ ]?|replace[-_ ]?me|example|placeholder|xxxx|<[^>]+>|\$\{|changeme|dummy|fake|sample|hunter2|correct-horse|a-long-enough-password|wrong-password|some-password|too-short|not-a-valid|demo-password|test-only)/i;

/**
 * An escape hatch for a line that is a known false positive.
 *
 * Put `check-secrets:allow` in a comment on the same line, or on the line
 * immediately above. This is better than widening a rule: it is explicit,
 * greppable, and shows up in review, so nobody silences the scanner by accident.
 */
const ALLOW_MARKER = /check-secrets:allow/;

const RULES = [
  {
    id: 'postgres-url-with-password',
    test: /postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/gi,
    hint: 'A PostgreSQL connection string with an inline password. Put it in .env and read process.env.DATABASE_URL.',
    allow: (m) =>
      PLACEHOLDER.test(m) ||
      /:\/\/postgres:postgres@localhost/i.test(m) ||
      /:\/\/user:password@/i.test(m) ||
      /:\/\/app:app@localhost/i.test(m),
  },
  {
    id: 'aws-access-key-id',
    test: /\bAKIA[0-9A-Z]{16}\b/g,
    hint: 'Looks like an AWS access key ID.',
  },
  {
    id: 'private-key-block',
    test: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    hint: 'A private key must never live in version control.',
  },
  {
    id: 'json-web-token',
    test: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    hint: 'Looks like a signed JWT. Generate tokens at runtime instead of hard-coding them.',
  },
  {
    id: 'github-token',
    test: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    hint: 'Looks like a GitHub personal access token.',
  },
  {
    id: 'api-secret-key',
    test: /\bsk-[A-Za-z0-9]{20,}\b/g,
    hint: 'Looks like an API secret key.',
  },
  {
    id: 'hardcoded-secret-assignment',
    test: /\b(?:jwt_secret|api_key|apikey|secret_key|client_secret|password|passwd|access_token)\b\s*[:=]\s*['"`]([^'"`\n]{8,})['"`]/gi,
    hint: 'A secret-looking value is hard-coded. Read it from process.env instead.',
    allow: (m) =>
      PLACEHOLDER.test(m) ||
      /['"`](postgres|password|correct-horse-battery-staple|hunter2|test-only[^'"`]*|[a-z-]*test[a-z-]*)['"`]/i.test(m),
  },
];

const NUL = String.fromCharCode(0);

function candidateFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split(NUL).filter(Boolean);
}

function isScannable(file) {
  if (IGNORED.some((re) => re.test(file))) return false;
  if (SKIP_EXT.test(file)) return false;
  try {
    if (statSync(file).size > 2 * 1024 * 1024) return false;
  } catch {
    return false;
  }
  return true;
}

const findings = [];

for (const file of candidateFiles()) {
  if (!isScannable(file)) continue;

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (text.includes(NUL)) continue; // binary

  const lines = text.split('\n');

  for (const rule of RULES) {
    rule.test.lastIndex = 0;
    let match;
    while ((match = rule.test.exec(text)) !== null) {
      const value = match[0];
      if (rule.allow?.(value)) continue;
      const line = text.slice(0, match.index).split('\n').length;

      // Honour an explicit suppression on this line or the one above it.
      const thisLine = lines[line - 1] ?? '';
      const previousLine = lines[line - 2] ?? '';
      if (ALLOW_MARKER.test(thisLine) || ALLOW_MARKER.test(previousLine)) continue;

      findings.push({
        file,
        line,
        rule: rule.id,
        hint: rule.hint,
        excerpt: (lines[line - 1] ?? '').trim().slice(0, 120),
      });
    }
  }
}

if (findings.length === 0) {
  console.log('OK  check:secrets - no credential-shaped strings found in tracked files.');
  process.exit(0);
}

console.error(`FAIL  check:secrets - ${findings.length} potential credential(s) found:\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}]`);
  console.error(`    ${f.excerpt}`);
  console.error(`    -> ${f.hint}\n`);
}
console.error(
  'If a finding is a genuine false positive, add a `check-secrets:allow` comment on that\n' +
    'line (or the line above). Adjust a rule in scripts/check-secrets.mjs only when a whole\n' +
    'CLASS of false positive is unavoidable.',
);
process.exit(1);
