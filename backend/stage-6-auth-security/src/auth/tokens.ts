import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

/**
 * TOKENS.
 *
 * Before reaching for JWTs, be honest about the trade-off, because the default
 * answer is more often "sessions" than the internet suggests.
 *
 *   SESSIONS (an opaque id in a cookie, state on the server)
 *     + revocable INSTANTLY - delete the row
 *     + the token carries no data, so nothing leaks if it is stolen
 *     - needs shared storage (Redis, or your database)
 *
 *   JWT (signed claims, no server state)
 *     + no lookup on each request; works across services that share a key
 *     - CANNOT BE REVOKED before it expires, which is the big one
 *     - anyone holding it can read the payload (it is base64, not encrypted)
 *     - a growing pile of implementation footguns (see `algorithms` below)
 *
 * The usual right answer for a normal web app is sessions. JWTs earn their
 * place for short-lived access tokens between services, or where you genuinely
 * cannot share session storage.
 *
 * We use JWTs here because the failure modes are worth learning, and this
 * module shows how to close each one.
 */

export interface AccessTokenPayload {
  /** Subject - the user id. A registered JWT claim; use it rather than `userId`. */
  sub: string;
  email: string;
  role: 'user' | 'admin';
  /** JWT ID. Lets you deny-list one specific token if you have to. */
  jti: string;
}

export interface TokenConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

/** Minimum entropy for an HMAC secret. Shorter is brute-forceable offline. */
const MIN_SECRET_LENGTH = 32;

export function loadTokenConfig(env: NodeJS.ProcessEnv = process.env): TokenConfig {
  const secret = env.JWT_SECRET;

  /*
   * FAIL AT BOOT if the secret is missing or weak.
   *
   * The catastrophic version of this bug is a fallback:
   *
   *   const secret = process.env.JWT_SECRET ?? 'dev-secret';   // NEVER
   *
   * That ships to production the first time an environment variable is
   * forgotten, and now anyone who has read your source can mint valid tokens
   * for any user. Crash instead.
   */
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.\n` +
        'Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"\n' +
        'Put it in .env (git-ignored). Never commit it, and never fall back to a default.',
    );
  }

  return {
    secret,
    // SHORT. An access token cannot be revoked, so its lifetime IS your
    // exposure window if it leaks. Minutes, not days.
    expiresIn: env.JWT_EXPIRES_IN ?? '15m',
    issuer: env.JWT_ISSUER ?? 'fullstack-training',
    audience: env.JWT_AUDIENCE ?? 'fullstack-training-api',
  };
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, 'jti'>,
  config: TokenConfig,
): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.secret, {
    // Pinning the algorithm at signing time is half of the fix; verifying with
    // an explicit allow-list is the other half. See `verifyAccessToken`.
    algorithm: 'HS256',
    expiresIn: config.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: config.issuer,
    audience: config.audience,
  });
}

export class TokenError extends Error {
  constructor(
    message: string,
    readonly reason: 'expired' | 'invalid',
  ) {
    super(message);
    this.name = 'TokenError';
  }
}

export function verifyAccessToken(token: string, config: TokenConfig): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, config.secret, {
      /*
       * THE ALGORITHM CONFUSION ATTACK, and why this line is not optional.
       *
       * Without an explicit allow-list, a library may honour the `alg` field in
       * the token's own header - which the ATTACKER controls. Two classic
       * exploits:
       *
       *   alg: "none"  - "this token is unsigned, please accept it"
       *   alg: "HS256" against an RS256 setup - the attacker signs with your
       *                 PUBLIC key, which you were verifying with, and the
       *                 library happily treats it as the HMAC secret
       *
       * `algorithms: ['HS256']` says: I decide, not the token.
       */
      algorithms: ['HS256'],

      // Verify who issued it and who it is for. Without these, a token minted
      // by a different service that shares the secret is accepted here.
      issuer: config.issuer,
      audience: config.audience,
    });

    if (typeof decoded === 'string' || !decoded.sub) {
      throw new TokenError('Malformed token payload', 'invalid');
    }

    return {
      sub: decoded.sub,
      email: String(decoded.email ?? ''),
      role: decoded.role === 'admin' ? 'admin' : 'user',
      jti: String(decoded.jti ?? ''),
    };
  } catch (error) {
    if (error instanceof TokenError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      // Distinguished so the client knows to refresh rather than to log in.
      throw new TokenError('Token has expired', 'expired');
    }
    throw new TokenError('Token is invalid', 'invalid');
  }
}

/**
 * Refresh tokens: how you get short access tokens without making users log in
 * every fifteen minutes.
 *
 *   access token   ~15 min, a JWT, sent on every request
 *   refresh token  ~30 days, OPAQUE AND RANDOM, stored server-side, sent only
 *                  to /auth/refresh
 *
 * The refresh token is deliberately not a JWT. It is a random string whose hash
 * you store, so you CAN revoke it - which is the property access tokens lack.
 *
 * ROTATION: issue a new refresh token on every use and invalidate the old one.
 * If an old one is ever presented again, that means it was stolen and replayed:
 * revoke the whole family and force a re-login.
 */
export function generateRefreshToken(): string {
  // 32 random bytes = 256 bits. Use randomUUID/randomBytes, never Math.random,
  // which is not cryptographically secure and is seeded predictably.
  return `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
}
