import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPasswordConstantTime } from './passwords.ts';
import { signAccessToken, type TokenConfig } from './tokens.ts';
import { requireAuth } from './middleware.ts';
import { ConflictError } from '../domain/errors.ts';
import { UnauthorizedError } from '../domain/authErrors.ts';

/**
 * Registration, login and `/me`.
 *
 * The user store is in memory - Stage 5 covered persistence, and mixing the two
 * would obscure the security content. The final project puts them together.
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface UserStore {
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

export function createInMemoryUserStore(seed: User[] = []): UserStore {
  const users = new Map(seed.map((user) => [user.id, user]));

  return {
    async findByEmail(email) {
      const needle = email.trim().toLowerCase();
      return [...users.values()].find((user) => user.email.toLowerCase() === needle);
    },
    async findById(id) {
      return users.get(id);
    },
    async create(input) {
      const user: User = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      users.set(user.id, user);
      return user;
    },
  };
}

const registerSchema = z.object({
  email: z.email('Enter a valid email address').max(255),
  displayName: z.string().trim().min(1).max(100),
  /*
   * LENGTH over composition rules.
   *
   * NIST SP 800-63B is explicit: require length, allow everything (including
   * spaces and emoji), and do NOT impose "one uppercase, one digit, one
   * symbol". Composition rules push people towards `Password1!`, which is in
   * every cracking dictionary, and towards writing passwords down.
   *
   * 12 characters minimum; 72 bytes maximum because bcrypt truncates there.
   */
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long'),
});

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

/**
 * RATE LIMITING on the auth endpoints specifically.
 *
 * Without it, an attacker gets unlimited guesses against every account in your
 * database. Bcrypt makes each guess slow, but "slow" times "unlimited" is still
 * a compromise, and it also lets them exhaust your CPU (each attempt costs YOU
 * ~200ms of hashing - a denial of service you are paying for).
 *
 * `skipSuccessfulRequests` means a legitimate user who logs in correctly is
 * never locked out by their own activity.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
});

export function createAuthRouter(store: UserStore, tokens: TokenConfig): Router {
  const router = Router();

  router.post('/register', loginRateLimit, async (req, res) => {
    const input = registerSchema.parse(req.body);

    if (await store.findByEmail(input.email)) {
      /*
       * A DELIBERATE TRADE-OFF, and one to make consciously.
       *
       * This response confirms the email is registered - user enumeration. The
       * privacy-preserving alternative is to always return 202 and send an
       * email ("you already have an account" or "confirm your address"), so the
       * API never reveals which.
       *
       * That is right for a dating site or a medical service. For a task app,
       * a clear error is better UX and the leak is minor. What matters is that
       * you CHOSE, rather than defaulted.
       */
      throw new ConflictError('An account with that email already exists', {
        email: 'already registered',
      });
    }

    const user = await store.create({
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      // The role is set by the SERVER. Reading it from req.body would let
      // anyone register as an admin - privilege escalation via mass assignment.
      role: 'user',
    });

    res.status(201).json({
      data: { user: toPublicUser(user), accessToken: issueToken(user, tokens) },
    });
  });

  router.post('/login', loginRateLimit, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await store.findByEmail(input.email);

    /*
     * TIMING: the same work happens whether or not the account exists.
     *
     * `verifyPasswordConstantTime` hashes against a dummy when `user` is
     * undefined, so an unknown email takes the same ~200ms as a known one.
     * Without this, an attacker enumerates your whole user list by timing
     * alone - no successful login needed.
     */
    const valid = await verifyPasswordConstantTime(input.password, user?.passwordHash);

    if (!user || !valid) {
      // ONE message for both cases. "No such user" vs "wrong password" hands an
      // attacker a free account-existence oracle.
      throw new UnauthorizedError('Invalid email or password');
    }

    res.json({ data: { user: toPublicUser(user), accessToken: issueToken(user, tokens) } });
  });

  router.get('/me', requireAuth(tokens), async (req, res) => {
    // `req.user!` is safe here ONLY because requireAuth ran. This is exactly
    // why the type declares `user` as optional - the compiler makes you think
    // about it at every use.
    const user = await store.findById(req.user!.sub);
    if (!user) throw new UnauthorizedError('Account no longer exists');

    res.json({ data: toPublicUser(user) });
  });

  return router;
}

function issueToken(user: User, tokens: TokenConfig): string {
  return signAccessToken({ sub: user.id, email: user.email, role: user.role }, tokens);
}

/**
 * The public projection.
 *
 * An ALLOW-LIST, not `delete user.passwordHash`. Adding a `resetToken` column
 * later would silently start leaking it from a deny-list; with this, new fields
 * are private until you say otherwise.
 */
function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}
