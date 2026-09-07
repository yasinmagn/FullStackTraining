import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';

/**
 * PASSWORD STORAGE.
 *
 * The rule, and there is only one: NEVER store a password you can read back.
 *
 * Not plaintext. Not encrypted (encryption is reversible, and the key is on the
 * same server). Not MD5 or SHA-256 either - those are FAST hashes, designed to
 * digest gigabytes per second, which is precisely the wrong property. A modern
 * GPU tries billions of SHA-256 guesses per second against a stolen database.
 *
 * A password hash must be DELIBERATELY SLOW and SALTED.
 */

/**
 * The cost factor. Work doubles for each +1, so 12 is 4x the work of 10.
 *
 * Pick it by measurement, not folklore: aim for roughly 100-250ms on your
 * production hardware. Fast enough that login feels instant, slow enough that
 * an offline attacker gets a few thousand guesses per second instead of
 * billions.
 *
 * Re-benchmark every couple of years - hardware gets faster, and this number
 * has to keep up.
 */
const COST = 12;

/**
 * bcrypt truncates at 72 BYTES (not characters - a multi-byte character eats
 * several). Anything beyond is silently ignored, so "correct horse battery
 * staple ..." and the same string with a different 100th character would hash
 * identically. Reject long inputs rather than silently truncating.
 */
const MAX_PASSWORD_BYTES = 72;

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
  }

  /*
   * The SALT is generated per password and stored INSIDE the resulting hash
   * string. You do not manage it, and you must not reuse one.
   *
   * A salt is what makes two users with the same password produce different
   * hashes - which is what defeats rainbow tables and stops "crack one, crack
   * them all".
   *
   * The output looks like:
   *   $2b$12$LQv3c1yqBWVHxkd0LHAkCO.YHl.HRHVlvS8bqQ0eF6TvV0y8Ge0hy
   *    ^   ^  ^                      ^
   *    |   |  salt (22 chars)         hash
   *    |   cost factor
   *    algorithm
   *
   * Because the cost is embedded, you can raise COST later and still verify old
   * hashes - then re-hash on next successful login.
   */
  return bcrypt.hash(password, COST);
}

/**
 * Verify a password.
 *
 * `bcrypt.compare` is constant-time with respect to the hash, so it does not
 * leak how much of the hash matched via timing.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    // A malformed hash in the database should be a failed login, not a 500.
    return false;
  }
}

/**
 * A dummy hash, used to defend against USER ENUMERATION.
 *
 * The attack: if login returns instantly for an unknown email and takes 200ms
 * for a known one, an attacker can enumerate your entire user list by timing
 * alone - no successful login required. That list is then worth money, and is
 * the input to a credential-stuffing run.
 *
 * The fix is to do the same work either way. When the user does not exist, we
 * still run a bcrypt comparison against this throwaway hash.
 */
const DUMMY_HASH = bcrypt.hashSync('a-password-that-is-never-correct', COST);

export async function verifyPasswordConstantTime(
  password: string,
  hash: string | undefined,
): Promise<boolean> {
  if (hash === undefined) {
    // Burn the same ~200ms, then fail.
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return verifyPassword(password, hash);
}

/**
 * Constant-time comparison for NON-password secrets: API keys, reset tokens,
 * webhook signatures.
 *
 * `a === b` on strings short-circuits at the first differing byte, which leaks
 * how many leading bytes were correct. Given enough samples that is enough to
 * reconstruct a secret one byte at a time.
 *
 * `timingSafeEqual` always compares every byte. Note the length check first -
 * it throws on mismatched lengths, and length is not usually the secret.
 */
export function secureCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
