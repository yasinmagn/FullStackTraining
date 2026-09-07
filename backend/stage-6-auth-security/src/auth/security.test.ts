import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../http/app.ts';
import { createInMemoryUserStore, type UserStore } from './authRoutes.ts';
import { createInMemoryTaskStore, type TaskStore } from '../http/taskRoutes.ts';
import { loadTokenConfig, signAccessToken, verifyAccessToken, type TokenConfig } from './tokens.ts';
import { hashPassword, secureCompare, verifyPassword } from './passwords.ts';

/**
 * SECURITY TESTS.
 *
 * A security control you have not tested is a security control you hope you
 * have. Each test below corresponds to a specific attack.
 */

const TEST_SECRET = 'a-test-only-secret-that-is-definitely-long-enough-32';

const tokens: TokenConfig = {
  secret: TEST_SECRET,
  expiresIn: '15m',
  issuer: 'test-issuer',
  audience: 'test-audience',
};

const quiet = { log: vi.fn(), error: vi.fn() };

let users: UserStore;
let tasks: TaskStore;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  users = createInMemoryUserStore();
  tasks = createInMemoryTaskStore();
  // Rate limiting off: the limiter is stateful across an entire test file and
  // would fail unrelated tests once the window filled. It has its own test.
  app = createApp({ users, tasks, tokens, logger: quiet, enableRateLimit: false });
});

async function register(email: string, password = 'a-long-enough-password') {
  const response = await request(app)
    .post('/auth/register')
    .send({ email, displayName: email.split('@')[0], password })
    .expect(201);
  return response.body.data.accessToken as string;
}

// =============================================================================
describe('password storage', () => {
  it('never stores the password itself', async () => {
    await register('ada@example.com');
    const user = await users.findByEmail('ada@example.com');

    expect(user!.passwordHash).not.toContain('a-long-enough-password');
    // $2b$ = bcrypt, 12 = cost factor.
    expect(user!.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('produces a different hash for the same password', async () => {
    const [a, b] = await Promise.all([hashPassword('identical-password'), hashPassword('identical-password')]);

    // The per-password SALT is what does this, and it is what defeats rainbow
    // tables and "crack one, crack them all".
    expect(a).not.toBe(b);
    expect(await verifyPassword('identical-password', a)).toBe(true);
    expect(await verifyPassword('identical-password', b)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects a password over bcrypt 72-byte limit instead of truncating', async () => {
    // Silently truncating would make two different long passwords equivalent.
    await expect(hashPassword('x'.repeat(100))).rejects.toThrow(/at most 72 bytes/);
  });

  it('does not leak a 500 on a corrupt stored hash', async () => {
    expect(await verifyPassword('anything', 'not-a-valid-bcrypt-hash')).toBe(false);
  });

  it('secureCompare handles equal and unequal values', async () => {
    expect(secureCompare('abc123', 'abc123')).toBe(true);
    expect(secureCompare('abc123', 'abc124')).toBe(false);
    // Different lengths must not throw - timingSafeEqual does.
    expect(secureCompare('short', 'a-much-longer-value')).toBe(false);
  });
});

// =============================================================================
describe('user enumeration', () => {
  it('returns the same message for an unknown email and a wrong password', async () => {
    await register('ada@example.com');

    const unknown = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'a-long-enough-password' })
      .expect(401);

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password-here' })
      .expect(401);

    // "No such user" vs "wrong password" is a free account-existence oracle.
    expect(unknown.body.error.message).toBe('Invalid email or password');
    expect(wrongPassword.body.error.message).toBe(unknown.body.error.message);
  });

  it('takes comparable time whether or not the account exists', async () => {
    await register('ada@example.com');

    const time = async (email: string) => {
      const start = performance.now();
      await request(app).post('/auth/login').send({ email, password: 'some-password-here' });
      return performance.now() - start;
    };

    const known = await time('ada@example.com');
    const unknown = await time('nobody@example.com');

    /*
     * Both paths run a bcrypt comparison, so both cost ~200ms. Without the
     * dummy hash the unknown-email path would return in ~1ms and an attacker
     * could enumerate every account by timing alone.
     *
     * The bound is generous because CI timing is noisy - we are asserting the
     * same ORDER of magnitude, not a precise figure.
     */
    expect(unknown).toBeGreaterThan(known * 0.3);
  });
});

// =============================================================================
describe('JWT verification', () => {
  it('accepts a token it issued', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.c', role: 'user' }, tokens);
    expect(verifyAccessToken(token, tokens)).toMatchObject({ sub: 'user-1', role: 'user' });
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'user-1', role: 'admin' }, 'the-attackers-own-secret', {
      issuer: tokens.issuer,
      audience: tokens.audience,
    });
    expect(() => verifyAccessToken(forged, tokens)).toThrow(/invalid/i);
  });

  it('rejects alg:none - the algorithm confusion attack', () => {
    // The attacker rewrites the header to say the token is unsigned. Without
    // `algorithms: ['HS256']` on verify, some configurations accept it.
    const unsigned = jwt.sign({ sub: 'user-1', role: 'admin' }, '', {
      algorithm: 'none',
      issuer: tokens.issuer,
      audience: tokens.audience,
    });
    expect(() => verifyAccessToken(unsigned, tokens)).toThrow();
  });

  it('rejects a token issued for a different audience', () => {
    const otherService = jwt.sign({ sub: 'user-1' }, TEST_SECRET, {
      issuer: tokens.issuer,
      audience: 'some-other-api',
    });
    // Without the audience check, a token from a sibling service that shares
    // the secret would be accepted here.
    expect(() => verifyAccessToken(otherService, tokens)).toThrow();
  });

  it('distinguishes expired from invalid', () => {
    const expired = jwt.sign({ sub: 'user-1' }, TEST_SECRET, {
      issuer: tokens.issuer,
      audience: tokens.audience,
      expiresIn: '-1s',
    });

    // The client needs to know whether to refresh or to re-login.
    expect(() => verifyAccessToken(expired, tokens)).toThrow(/expired/i);
  });

  it('refuses to start with a missing or weak JWT_SECRET', () => {
    expect(() => loadTokenConfig({})).toThrow(/JWT_SECRET must be set/);
    expect(() => loadTokenConfig({ JWT_SECRET: 'too-short' })).toThrow(/at least 32/);
  });
});

// =============================================================================
describe('authentication (401)', () => {
  it('rejects a request with no token', async () => {
    const response = await request(app).get('/api/tasks').expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    // The standard way to tell a client how to authenticate.
    expect(response.headers['www-authenticate']).toBe('Bearer');
  });

  it('rejects a malformed Authorization header', async () => {
    await request(app).get('/api/tasks').set('authorization', 'Basic abc123').expect(401);
    await request(app).get('/api/tasks').set('authorization', 'Bearer').expect(401);
    await request(app).get('/api/tasks').set('authorization', 'garbage').expect(401);
  });

  it('accepts a valid token', async () => {
    const token = await register('ada@example.com');
    await request(app).get('/api/tasks').set('authorization', `Bearer ${token}`).expect(200);
  });
});

// =============================================================================
describe('broken access control (OWASP #1)', () => {
  it('does not let one user read another user\'s task', async () => {
    const adaToken = await register('ada@example.com');
    const graceToken = await register('grace@example.com');

    const created = await request(app)
      .post('/api/tasks')
      .set('authorization', `Bearer ${adaToken}`)
      .send({ title: "Ada's private task" })
      .expect(201);

    const taskId = created.body.data.id;

    /*
     * THE IDOR TEST. Grace is fully authenticated - she just has no right to
     * this task.
     *
     * 404, NOT 403: a 403 would confirm the id exists, letting an attacker
     * enumerate valid ids by watching which return 403 instead of 404.
     */
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('authorization', `Bearer ${graceToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    // The response must not leak the title either.
    expect(JSON.stringify(response.body)).not.toContain("Ada's private task");
  });

  it('scopes the list to the authenticated user', async () => {
    const adaToken = await register('ada@example.com');
    const graceToken = await register('grace@example.com');

    await request(app).post('/api/tasks').set('authorization', `Bearer ${adaToken}`).send({ title: 'Ada task' });
    await request(app).post('/api/tasks').set('authorization', `Bearer ${graceToken}`).send({ title: 'Grace task' });

    const adaTasks = await request(app).get('/api/tasks').set('authorization', `Bearer ${adaToken}`).expect(200);

    // The query is scoped, so there is no check to forget.
    expect(adaTasks.body.data).toHaveLength(1);
    expect(adaTasks.body.data[0].title).toBe('Ada task');
  });

  it('does not let one user delete another user\'s task', async () => {
    const adaToken = await register('ada@example.com');
    const graceToken = await register('grace@example.com');

    const created = await request(app)
      .post('/api/tasks')
      .set('authorization', `Bearer ${adaToken}`)
      .send({ title: 'Do not delete me' })
      .expect(201);

    await request(app)
      .delete(`/api/tasks/${created.body.data.id}`)
      .set('authorization', `Bearer ${graceToken}`)
      .expect(404);

    // Still there.
    await request(app)
      .get(`/api/tasks/${created.body.data.id}`)
      .set('authorization', `Bearer ${adaToken}`)
      .expect(200);
  });
});

// =============================================================================
describe('privilege escalation', () => {
  it('ignores a role supplied at registration', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'sneaky@example.com',
        displayName: 'Sneaky',
        password: 'a-long-enough-password',
        role: 'admin', // <- mass assignment attempt
      })
      .expect(201);

    // The server sets the role. Reading it from req.body would be instant
    // privilege escalation for anyone who can read your API docs.
    const user = await users.findByEmail('sneaky@example.com');
    expect(user!.role).toBe('user');
  });

  it('returns 403 - not 401 - when an authenticated user lacks the role', async () => {
    const token = await register('regular@example.com');

    const response = await request(app)
      .get('/api/tasks/admin/all')
      .set('authorization', `Bearer ${token}`)
      .expect(403);

    // 401 = we do not know who you are. 403 = we do, and no.
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('ignores an ownerId supplied in the body', async () => {
    const adaToken = await register('ada@example.com');
    const graceToken = await register('grace@example.com');
    const grace = await users.findByEmail('grace@example.com');

    const created = await request(app)
      .post('/api/tasks')
      .set('authorization', `Bearer ${adaToken}`)
      .send({ title: 'Whose task is this', ownerId: grace!.id })
      .expect(201);

    // The owner comes from the TOKEN. Ada cannot plant a task in Grace's list.
    const ada = await users.findByEmail('ada@example.com');
    expect(created.body.data.ownerId).toBe(ada!.id);

    const graceTasks = await request(app).get('/api/tasks').set('authorization', `Bearer ${graceToken}`);
    expect(graceTasks.body.data).toHaveLength(0);
  });
});

// =============================================================================
describe('input validation and information leakage', () => {
  it('rejects a short password', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'a@example.com', displayName: 'A', password: 'short' })
      .expect(400);

    expect(response.body.error.details.password).toMatch(/at least 12/);
  });

  it('rejects an invalid email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', displayName: 'A', password: 'a-long-enough-password' })
      .expect(400);
  });

  it('never returns the password hash', async () => {
    const token = await register('ada@example.com');
    const response = await request(app).get('/auth/me').set('authorization', `Bearer ${token}`).expect(200);

    // An allow-list projection, not `delete user.passwordHash` - so a column
    // added later is private by default.
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(Object.keys(response.body.data).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
      'role',
    ]);
  });

  it('never leaks internals in a 500', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    const boom = createApp({
      users,
      tasks,
      tokens,
      logger,
      enableRateLimit: false,
      registerExtraRoutes: (a) => {
        a.get('/boom', () => {
          throw new Error('postgres://admin:hunter2@db.internal:5432/prod');
        });
      },
    });

    const response = await request(boom).get('/boom').expect(500);

    // The client learns nothing: no credentials, no hostname, no stack.
    expect(response.body.error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(response.body)).not.toMatch(/hunter2|db\.internal/);

    // ...while the full detail IS logged server-side, tied to the request id.
    const logged = JSON.parse(logger.error.mock.calls[0]![0] as string);
    expect(logged.message).toContain('hunter2');
    expect(logged.requestId).toBe(response.body.error.requestId);
  });

  it('rejects an oversized body with 413', async () => {
    const token = await register('ada@example.com');
    await request(app)
      .post('/api/tasks')
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'x'.repeat(200_000) })
      .expect(413);
  });
});

// =============================================================================
describe('security headers and CORS', () => {
  it('sets the headers helmet provides', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows a configured origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('origin', 'http://localhost:5173')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not reflect an arbitrary origin', async () => {
    const response = await request(app).get('/health').set('origin', 'https://evil.example').expect(200);

    // `origin: true` would have echoed evil.example back, which is no
    // protection at all.
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

// =============================================================================
describe('rate limiting', () => {
  it('blocks repeated failed logins', async () => {
    const limited = createApp({ users, tasks, tokens, logger: quiet, enableRateLimit: true });
    await request(limited)
      .post('/auth/register')
      .send({ email: 'ada@example.com', displayName: 'Ada', password: 'a-long-enough-password' });

    let sawRateLimit = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const response = await request(limited)
        .post('/auth/login')
        .send({ email: 'ada@example.com', password: 'wrong-password' });

      if (response.status === 429) {
        sawRateLimit = true;
        break;
      }
    }

    // Without this, bcrypt's slowness is the only thing between an attacker and
    // unlimited guesses - and each guess costs YOU 200ms of CPU.
    expect(sawRateLimit).toBe(true);
  });
});
