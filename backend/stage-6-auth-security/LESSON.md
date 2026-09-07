# Backend Stage 6 — Auth & Security

> **Goal:** store passwords properly, issue and verify tokens without the
> classic footguns, and — most importantly — get authorisation right, because
> broken access control is the bug you are most likely to ship.

| | |
|---|---|
| **Time** | ~3.5 hours |
| **Prerequisites** | [Stage 3](../stage-3-rest-api-design/LESSON.md) |
| **You will build** | Registration, login and ownership-scoped resources, with **32 tests, each mapped to a specific attack** |

---

## 1. Run it

Set a real `JWT_SECRET` in `.env` first:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
npm run dev --workspace backend-stage-6-auth-security
npm test    --workspace backend-stage-6-auth-security
```

```bash
curl -X POST localhost:3000/auth/register -H 'content-type: application/json' \
  -d '{"email":"me@example.com","displayName":"Me","password":"a-long-enough-password"}'

curl localhost:3000/api/tasks                                    # 401
curl localhost:3000/api/tasks -H 'authorization: Bearer <token>'  # 200
```

---

## 2. Passwords

**The rule, and there is only one: never store a password you can read back.**

Not plaintext. Not encrypted — encryption is reversible and the key is on the
same server. Not MD5 or SHA-256 either: those are *fast* hashes, designed to
digest gigabytes per second, which is exactly the wrong property. A modern GPU
tries **billions** of SHA-256 guesses per second against a stolen database.

A password hash must be **deliberately slow** and **salted**.

| Algorithm | Verdict |
|---|---|
| Plaintext | Criminal |
| MD5 / SHA-1 / SHA-256 | Broken for passwords — far too fast |
| bcrypt | Fine. Battle-tested since 1999. Note the 72-byte limit |
| scrypt | Good. Memory-hard |
| **Argon2id** | Best. Winner of the Password Hashing Competition |

We use bcrypt here because `bcryptjs` is pure JavaScript and installs
everywhere. In production, prefer Argon2id.

### The cost factor

```ts
const COST = 12;   // work doubles per +1, so 12 is 4× the work of 10
```

Pick it by **measurement**, not folklore: aim for roughly 100–250ms on your
production hardware. Fast enough that login feels instant; slow enough that an
offline attacker gets thousands of guesses per second instead of billions.

Re-benchmark every couple of years — hardware gets faster and this number has to
keep up. Because the cost is stored *inside* the hash, you can raise it and
still verify old hashes, then re-hash on next successful login.

### Salts

```
$2b$12$LQv3c1yqBWVHxkd0LHAkCO.YHl.HRHVlvS8bqQ0eF6TvV0y8Ge0hy
 ^   ^  ^                      ^
 |   |  salt (22 chars)         hash
 |   cost
 algorithm
```

The salt is generated per password and stored in the hash. You do not manage it
and must never reuse one. It is what makes two users with the same password
produce different hashes — which defeats rainbow tables and stops "crack one,
crack them all". There is a test asserting exactly that.

### bcrypt's 72-byte limit

Anything beyond 72 **bytes** (not characters — a multi-byte character eats
several) is silently ignored. Reject long inputs rather than silently
truncating, or two different long passwords become equivalent.

### Password rules: length, not composition

NIST SP 800-63B is explicit: **require length, allow everything, and do not
impose "one uppercase, one digit, one symbol"**. Composition rules push people
towards `Password1!` — which is in every cracking dictionary — and towards
writing passwords down.

```ts
password: z.string().min(12, 'Password must be at least 12 characters')
```

---

## 3. Timing attacks and user enumeration

**The attack:** login returns in 1ms for an unknown email and 200ms for a known
one. An attacker enumerates your entire user list by timing alone — no
successful login needed. That list is worth money and is the input to a
credential-stuffing run.

**The fix:** do the same work either way.

```ts
export async function verifyPasswordConstantTime(password, hash) {
  if (hash === undefined) {
    await bcrypt.compare(password, DUMMY_HASH);   // burn the same ~200ms
    return false;
  }
  return verifyPassword(password, hash);
}
```

And return **one message** for both cases:

```ts
throw new UnauthorizedError('Invalid email or password');
```

"No such user" versus "wrong password" hands an attacker a free
account-existence oracle.

### Non-password secrets need constant-time comparison too

```ts
a === b                                  // ✗ short-circuits at the first differing byte
timingSafeEqual(Buffer.from(a), Buffer.from(b))   // ✓
```

For API keys, reset tokens and webhook signatures, `===` leaks how many leading
bytes were correct. Given enough samples that is enough to reconstruct a secret
one byte at a time.

---

## 4. Sessions vs JWTs — be honest about this

| | Sessions (opaque id + server state) | JWT (signed claims, no state) |
|---|---|---|
| Revoke immediately | ✅ delete the row | ❌ **valid until it expires** |
| Contents readable by holder | No | **Yes** — base64, not encrypted |
| Needs shared storage | Yes (Redis/DB) | No |
| Implementation footguns | Few | Several (see below) |

**For a normal web app the right answer is usually sessions.** JWTs earn their
place for short-lived access tokens between services, or where you genuinely
cannot share session storage.

We use JWTs here because the failure modes are worth learning.

### Never encode secrets in a JWT

The payload is base64, not encryption. Anyone holding the token can read it.
Paste one into [jwt.io](https://jwt.io) and see.

### Access + refresh tokens

| | Lifetime | Format | Revocable |
|---|---|---|---|
| Access | ~15 min | JWT, sent on every request | No |
| Refresh | ~30 days | **Opaque random**, stored server-side, only sent to `/auth/refresh` | **Yes** |

An access token cannot be revoked, so **its lifetime is your exposure window**
if it leaks. Minutes, not days.

The refresh token is deliberately *not* a JWT — it is a random string whose hash
you store, so you can revoke it.

**Rotation:** issue a new refresh token on every use and invalidate the old one.
If an old one is ever presented again, it was stolen and replayed: revoke the
whole family and force a re-login.

### The algorithm confusion attack

```ts
jwt.verify(token, secret, {
  algorithms: ['HS256'],    // ← not optional
  issuer, audience,
});
```

Without an explicit allow-list, a library may honour the `alg` field in the
token's own header — **which the attacker controls**. Two classic exploits:

- `alg: "none"` — "this token is unsigned, please accept it"
- `alg: "HS256"` against an RS256 setup — the attacker signs with your **public**
  key, and the library treats it as the HMAC secret

`algorithms: ['HS256']` says: *I* decide, not the token. There is a test for
`alg: none`.

`issuer` and `audience` matter too: without them, a token minted by a sibling
service that shares the secret is accepted here. Also tested.

### Never default the secret

```ts
const secret = process.env.JWT_SECRET ?? 'dev-secret';   // ✗ NEVER
```

That ships to production the first time an environment variable is forgotten,
and now anyone who has read your source can mint a token for any user —
including an admin. **Crash at boot instead**, which is what `loadTokenConfig`
does, with a test.

---

## 5. Authentication vs authorisation

Two different questions, two different middleware, two different status codes:

| | Question | Status | Middleware |
|---|---|---|---|
| **Authentication** | Who are you? | **401** | `requireAuth` |
| **Authorisation** | May you do this? | **403** | `requireRole`, ownership checks |

Conflating them leaks information: returning 403 to an anonymous request tells
an attacker the resource exists.

401 responses should carry `WWW-Authenticate: Bearer` — the standard way to say
how to authenticate.

---

## 6. Broken access control — OWASP #1

This is the most common serious bug in real APIs, and it is worth reading twice.

```ts
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
  const task = await repo.findById(req.params.id);
  res.json(task);                    // ← ANY logged-in user reads ANY task
});
```

Authentication passed. Authorisation was **never checked**. This is **IDOR**
(Insecure Direct Object Reference), and it reaches production constantly for one
reason:

> **The happy path works perfectly in testing, because you test as the owner.**

### Two rules

**1. Authorise every resource access, not just the route.**

**2. Prefer scoping the query over fetch-then-check.**

```ts
// ✓ BEST — cannot return someone else's data, because it never leaves the store
const tasks = await store.listForOwner(req.user.sub);

// ⚠️ NECESSARY when looking up by id — but there is a check to forget
const task = await store.findById(req.params.id);
if (!task || task.ownerId !== req.user.sub) throw new NotFoundError(...);
```

Scoping cannot be forgotten by the next person to edit the route. A check can.

### Return 404, not 403, for someone else's resource

```ts
if (!task || task.ownerId !== req.user.sub) throw new NotFoundError('Task', id);
```

A 403 **confirms the resource exists**, letting an attacker enumerate valid ids
by watching which return 403 instead of 404. To someone with no right to see a
resource, "forbidden" and "does not exist" should be indistinguishable.

---

## 7. Mass assignment and privilege escalation

```ts
const createTaskSchema = z.object({ title: z.string() });
//                       NOTE WHAT IS ABSENT: ownerId

const task = await store.create({
  title: input.title,
  ownerId: req.user.sub,     // ← from the TOKEN, never from the body
});
```

**The general rule:** any field that decides **who you are** or **what you may
do** must come from the session, never from user input.

The classic version is `User.update(req.body)` with a `role` column — instant
privilege escalation for anyone who reads your API docs. There are tests for
both a `role` and an `ownerId` supplied in the body.

### Allow-list your responses too

```ts
function toPublicUser(user) {
  return { id, email, displayName, role, createdAt };   // ✓ allow-list
}
// NOT: delete user.passwordHash                        // ✗ deny-list
```

Add a `resetToken` column later and the deny-list silently starts leaking it.
With an allow-list, new fields are private until you say otherwise.

---

## 8. The middleware layer

### `helmet`

| Header | Prevents |
|---|---|
| `Content-Security-Policy` | XSS — the strongest defence there is |
| `Strict-Transport-Security` | Downgrade to plain HTTP |
| `X-Content-Type-Options: nosniff` | An "image" being executed as JS |
| `X-Frame-Options` | Clickjacking |
| `Referrer-Policy` | URLs leaking to third parties |

### CORS: an allow-list, never a reflector

```ts
cors({ origin: ['http://localhost:5173'], credentials: true })   // ✓
cors({ origin: true })                                           // ✗ reflects anything
```

**Know what CORS is and is not.** It is a *browser* protection: it stops
evil.com's JavaScript reading your API using the visitor's cookies. It does
nothing about curl, Postman, or a server-side attacker.

> **CORS is never a substitute for authentication.**

### Rate limiting

```ts
rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true })
```

Without it, an attacker gets unlimited guesses against every account. Bcrypt
makes each guess slow, but "slow × unlimited" is still a compromise — and it
lets them exhaust your CPU, since each attempt costs **you** ~200ms of hashing.

`skipSuccessfulRequests` means a legitimate user is never locked out by their
own activity.

### `trust proxy`

```ts
app.set('trust proxy', 1);   // the number of proxies you actually have
```

Behind a load balancer, every request appears to come from the proxy's IP — so a
per-IP rate limit throttles *all* your users together.

**Never set it to `true` blindly.** That makes Express believe whatever
`X-Forwarded-For` says, and a client can forge that header to dodge the rate
limit entirely.

### Body size limits

```ts
express.json({ limit: '100kb' })
```

A security control, not a nicety: without it one request can make you allocate
gigabytes.

---

## 9. Never leak internals in a 500

```ts
return send(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
```

The test throws an error whose message is
`postgres://admin:hunter2@db.internal:5432/prod` and asserts that **none** of it
reaches the client — while the full detail *is* logged server-side, tied to the
request id.

---

## 10. Secrets

- **`.env`, git-ignored.** Never commit real credentials. `npm run check:secrets`
  from the repo root fails the build if anything credential-shaped reaches a
  tracked file.
- **`.env.example` is the contract** — every variable, placeholder values only.
- **Real environment variables beat `.env`.** `dotenv` does not overwrite what is
  already set, which is correct: production sets real env vars and a stale
  `.env` must never override them.
- **In production, use a secret manager** (AWS Secrets Manager, Vault, Doppler,
  your platform's own store) rather than files on disk.
- **Rotate on exposure.** A secret that has ever been committed is compromised
  forever — git history is permanent, and rewriting it does not help once
  someone has cloned. Rotate it; do not just delete the line.

---

## 11. What the 32 tests cover

Each maps to a specific attack:

| Attack | Test |
|---|---|
| Stolen database | Passwords are bcrypt-hashed, salted, never stored |
| Rainbow tables | The same password hashes differently twice |
| bcrypt truncation | >72 bytes is rejected, not silently cut |
| User enumeration (message) | Identical error for unknown email and wrong password |
| User enumeration (timing) | Both paths take the same order of magnitude |
| Token forgery | A token signed with another secret is rejected |
| `alg: none` | Rejected by the explicit algorithm allow-list |
| Cross-service token reuse | Wrong `audience` is rejected |
| Weak secret in production | `loadTokenConfig` throws at boot |
| Missing auth | 401 with `WWW-Authenticate` |
| **IDOR** | User B gets **404** for user A's task, and the title does not leak |
| Broken list scoping | Each user sees only their own tasks |
| Privilege escalation | `role` in the body is ignored |
| Ownership hijacking | `ownerId` in the body is ignored |
| Hash leakage | `/auth/me` returns an allow-listed projection |
| Stack-trace leakage | A 500 returns nothing; the detail is logged |
| CORS reflection | An arbitrary origin is not echoed back |
| Brute force | Repeated failed logins hit 429 |
| Memory exhaustion | An oversized body gets 413 |

---

## 12. Exercises

### Exercise 1 — Refresh tokens
Add `/auth/refresh` with rotation. Store hashed refresh tokens. Detect reuse of
a rotated token and revoke the whole family.

### Exercise 2 — Password reset
Single-use, time-limited tokens. **Store the hash, not the token** — a leaked
database must not yield working reset links. Return the same response whether or
not the email exists.

### Exercise 3 — Write the IDOR bug on purpose
Remove the ownership clause from `GET /api/tasks/:id`. Watch exactly one test
fail. Read it. Put it back.
*That one test is worth more than most of a security audit.*

### Exercise 4 — Move to sessions
Replace JWTs with server-side sessions in an httpOnly, Secure, SameSite=Lax
cookie. Which problems disappear? Which new one (CSRF) appears?

### Exercise 5 — Account lockout, done carefully
Lock an account after N failures. Then consider: an attacker can now lock out
any user by failing to log in as them. How do real systems handle this?
*Hint: rate limit by IP **and** account, use exponential backoff rather than a
hard lock, and notify the account owner.*

### Exercise 6 — Audit your own dependencies
Run `npm audit`. For each finding, decide whether it is reachable from your
code. Not every advisory applies to how you use the package — and "we upgraded
everything blindly" is its own kind of risk.

---

## 13. Checklist

- [ ] Why fast hashes are wrong for passwords, and what "slow" buys you
- [ ] What a salt prevents, and why it lives inside the hash
- [ ] Why length beats composition rules
- [ ] Two ways login can leak which accounts exist
- [ ] When sessions beat JWTs, and the honest trade-off
- [ ] Why `algorithms: ['HS256']` is not optional
- [ ] Why defaulting `JWT_SECRET` is catastrophic
- [ ] 401 vs 403, and when 404 is the right answer instead
- [ ] What IDOR is and why it survives testing
- [ ] Why scoping a query beats fetch-then-check
- [ ] Why any field deciding identity or permission comes from the session
- [ ] What CORS does and does not protect
- [ ] Why `trust proxy: true` can defeat your rate limiter

---

## 14. Further reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP — Password storage cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP — Authorization cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST SP 800-63B — Digital identity guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [JWT Best Current Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725)

**Next:** [Stage 7 — Testing & Observability](../stage-7-testing-observability/LESSON.md)
