# Backend Stage 7 — Testing & Observability

> **Goal:** know what to test at which level, and make a running service
> explain itself at 3am when you cannot attach a debugger.

| | |
|---|---|
| **Time** | ~3 hours |
| **Prerequisites** | [Stage 3](../stage-3-rest-api-design/LESSON.md), [Stage 5](../stage-5-data-access-migrations/LESSON.md) |
| **You will build** | A structured logger with redaction, a metrics registry, liveness/readiness probes, and full graceful shutdown — **23 tests** |

---

## 1. Run it

```bash
npm run dev --workspace backend-stage-7-testing-observability
npm test    --workspace backend-stage-7-testing-observability
```

```bash
curl localhost:3000/health/live
curl localhost:3000/health/ready
curl localhost:3000/metrics
curl -X POST localhost:3000/api/tasks -H 'content-type: application/json' -d '{"title":"Watch the logs"}'
```

Watch the JSON log lines as you do it, then press Ctrl-C and watch the shutdown
sequence.

---

## PART ONE — TESTING

## 2. The pyramid, and what actually goes where

```
        ╱ E2E ╲          few      slow, brittle, highest confidence
      ╱─────────╲
    ╱ Integration ╲      some     real DB / real HTTP stack
  ╱─────────────────╲
╱       Unit          ╲  many     pure functions, microseconds
```

What that means concretely in this repo:

| Level | Example | Cost |
|---|---|---|
| **Unit** | `taskReducer.test.ts`, `taskService.test.ts` | µs |
| **Integration** | `postgresTaskRepository.test.ts` (real PostgreSQL), `taskRoutes.test.ts` (real middleware stack) | ms |
| **E2E** | Playwright driving a browser against a running app | seconds |

The rule that keeps a suite fast: **test each rule once, at the cheapest level
that can prove it.** Testing every business rule through HTTP means paying for
JSON serialisation and the whole middleware stack to assert something a pure
function could have told you — and that is how a suite comes to take ten
minutes and nobody runs it.

Stage 3 shows the division working: 34 service tests cover the rules, and the
HTTP tests only check status codes, headers and envelopes.

---

## 3. Mock sparingly, inject instead

```ts
// ✓ The dependency is an argument.
createLogger({ write: (record) => records.push(record) });

// ✗ Last resort. Couples the test to an import path.
vi.mock('./logger.ts');
```

Module mocking breaks on every refactor, because it asserts on *how* your
modules are wired rather than what they do. Dependency injection is the fix —
and it is a design improvement, not a testing trick. Every `createX({...})`
factory in this repo exists partly for that reason.

### Do not mock the database

`postgresTaskRepository.test.ts` runs against real PostgreSQL. A mocked database
proves your mock matches your expectations, which was never in doubt. It cannot
tell you that a constraint fires, that a UUID cast fails, that your `ORDER BY`
is valid SQL, or that a unique index is case-insensitive — and those are the
bugs.

### Fake timers, when the wait is long

```ts
vi.useFakeTimers();
vi.advanceTimersByTime(35_000);
```

A test that waits 30 real seconds is a test nobody runs.

But note the contrast in this suite: the health-check timeout test uses a
**real** 50ms timer. When the delay is short *and the timing itself is the thing
under test*, real timers are simpler and prove more.

---

## 4. Test quality over coverage

Coverage measures which lines **ran**, never whether the assertions were worth
making:

```ts
it('works', () => {
  createTask({ title: 'x' });   // 100% coverage, zero assertions, zero value
});
```

Better questions than "what is our coverage?":

- If I broke this function, would a test fail?
- Does this test still pass when the bug it was written for comes back?
- Would this test survive a refactor that keeps the behaviour?

**Write the test that fails first.** A test you have never seen fail is a test
you have not verified.

The `/code-review` and exercise sections throughout this repo lean on this: the
best tests in the whole curriculum are the IDOR test in Stage 6 and the
connection-leak test in Stage 5, because each fails loudly for a real bug that
otherwise reaches production silently.

---

## PART TWO — OBSERVABILITY

## 5. The three signals

| Signal | Shape | Answers |
|---|---|---|
| **Logs** | Discrete events, high detail | "What happened to *this* request?" |
| **Metrics** | Numbers over time, cheap | "How is the system doing?" |
| **Traces** | One request across services | "Where did the 2 seconds go?" |

You need all three. Logs alone cannot answer "is latency worse than last week";
metrics alone cannot tell you why one specific user got a 500.

---

## 6. Structured logging

```ts
console.log(`User ${id} updated task ${taskId} in ${ms}ms`);   // ✗
logger.info('task.updated', { userId, taskId, durationMs });   // ✓
```

A log aggregator can filter, group and alert on structured fields. It can do
almost nothing with a sentence. The moment you want *"p95 duration of
task.updated, by user"*, the prose version needs a regex — and that regex breaks
the next time someone edits the message.

### Child loggers are the highest-value feature

```ts
req.log = logger.child({ requestId: req.id });
```

Every line written during a request carries the same `requestId`. "Show me
everything that happened to this request" becomes a **field filter** rather than
a guess. There is a test asserting every line from one request shares the id.

### Redact centrally

```ts
const REDACTED_KEYS = new Set(['password', 'token', 'authorization', 'apikey', ...]);
```

Sooner or later someone logs an entire request body, and that body contains a
password. Redacting in the logger means it **fails safe** — the person adding
the log line does not have to remember.

The implementation handles nesting, arrays, and `snake_case`/`kebab-case`
variants, and **bounds its recursion depth**. Infinite recursion inside a logger
on a cyclic object is a spectacular way to take down a service, so that bound is
not decoration; there is a test for it.

### Levels

| Level | Use for |
|---|---|
| `debug` | Development detail. Off in production |
| `info` | Business events: `task.created`, `user.registered` |
| `warn` | Recoverable oddities, 4xx responses |
| `error` | Something is broken and needs a human: 5xx, unhandled |

A common failure is logging everything at `info`, so `error` becomes meaningless
and alerting is impossible. Log the **event**, not a sentence, and pick the
level by "would I want to be paged for this?"

### Write to stdout

A container platform collects stdout. Writing to a file inside a container means
the logs vanish with the container.

---

## 7. Metrics

### Averages lie

If 99 requests take 10ms and one takes 10 seconds, the average is 110ms and
everything looks fine — while one user in a hundred stares at a frozen page.

Histogram buckets let you compute **percentiles**, and p95/p99 are what actually
describe user experience.

```ts
const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
```

Prometheus buckets are **cumulative**: `le="100"` counts everything ≤ 100ms.

### Cardinality is the trap

```ts
const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
```

`req.route.path` is the **route pattern** (`/api/tasks/:id`), not the resolved
URL (`/api/tasks/8f3a...`).

Every distinct label combination is a separate time series. Labelling by
resolved path creates **one series per task** and will melt your metrics
backend. The same goes for user ids, request ids and raw query strings. There is
a test asserting the task id never appears in the rendered metrics.

Note also that labels are sorted before forming the key: without that,
`{b,a}` and `{a,b}` become two series, and your graph shows two half-height
lines instead of one.

### The four golden signals

Latency, traffic, errors, saturation. If you instrument nothing else,
instrument these.

---

## 8. Health checks — the outage this prevents

Two endpoints, and the distinction is the whole point.

| Endpoint | Question | Failure means |
|---|---|---|
| `/health/live` | Is this process broken beyond repair? | **Kill and restart me** |
| `/health/ready` | Can I serve traffic right now? | **Take me out of the load balancer** |

### The classic outage

> Liveness checks the database. The database has a five-second hiccup. Every pod
> fails liveness. Kubernetes restarts **every pod at once**. They all reconnect
> simultaneously and hammer the recovering database. A five-second blip becomes
> a thirty-minute outage.

**Liveness must check only the process itself. No dependencies.** There is a
test asserting `/health/live` returns 200 even when the database check is
failing.

### Critical vs non-critical dependencies

```ts
{ name: 'database', check: pingDb,    critical: true  }   // down → 503
{ name: 'cache',    check: pingCache, critical: false }   // down → 200 "degraded"
```

Your cache being down should make you **slower, not absent**.

### Return the right status code

```ts
res.status(criticalFailure ? 503 : 200)
```

The load balancer reads the **status code**. It does not parse your JSON. A
cheerful `200 {"status":"unhealthy"}` keeps you in the rotation, serving errors.

### Time out every check

A health check that hangs is worse than one that fails: the orchestrator learns
nothing and waits. Note `Promise.race` with a `.finally(() => clearTimeout(...))`
— without the cleanup, a fast check leaves a pending timer holding the event
loop open.

---

## 9. Graceful shutdown, in full

The sequence in `server.ts`, and why each step is in that order:

1. **Stop passing readiness** so the load balancer stops sending new work. A
   few seconds here lets in-flight routing settle — without it you can still
   receive requests after you have begun shutting down.
2. **`server.close()`** — stop accepting connections, let in-flight requests
   finish.
3. **Close dependencies** — database pool, queue consumers, timers.
4. **Exit.**

Plus a **hard timeout**:

```ts
const force = setTimeout(() => { logger.error('shutdown.timeout'); process.exit(1); }, 15_000);
force.unref();
```

A hung request must not block the deploy — SIGKILL is coming either way, and you
would rather exit on your own terms with a log line. `unref()` stops the timer
itself from holding the process open.

The `shuttingDown` flag handles an impatient second Ctrl-C.

### `uncaughtException`: log and exit

After an uncaught exception the process is in an **unknown** state — a promise
half-resolved, a transaction half-committed. A supervisor restarting a clean
process beats a live process nobody can reason about.

---

## 10. Exercises

### Exercise 1 — A real readiness check
Replace the stub with `SELECT 1` against the Stage 5 pool. Stop your database
and watch `/health/ready` turn 503 while `/health/live` stays 200.

### Exercise 2 — An error-rate metric with an alert threshold
Add `http_errors_total`, then write the query you would alert on.
*Hint: a rate over a window, not a raw count — "50 errors" means nothing without
knowing the denominator.*

### Exercise 3 — Distributed tracing
Propagate a `traceparent` header (W3C Trace Context) and include it in every log
line. This is the third signal, and it is what tells you *which* of five
services spent the two seconds.

### Exercise 4 — Prove the shutdown works
Start the server, fire a slow request, send SIGTERM mid-flight. Confirm the
request completes and the process exits 0. Then make the request take 20s and
watch the hard timeout fire.

### Exercise 5 — Break liveness on purpose
Make `/health/live` check the database. Stop the database. Reason through what
Kubernetes would do to a ten-pod deployment.

### Exercise 6 — Read coverage sceptically
```bash
npm run test:coverage --workspace backend-stage-7-testing-observability
```
Find a well-covered file with weak tests. Add one test that would actually catch
a regression.

---

## 11. Checklist

- [ ] Which level of the pyramid each kind of rule belongs to
- [ ] Why injecting a dependency beats mocking a module
- [ ] Why the database is the wrong thing to mock
- [ ] Why coverage is a weak signal, and what to ask instead
- [ ] Why structured logs beat sentences
- [ ] What a child logger gives you, and why redaction must be central
- [ ] Why averages hide the users who are suffering
- [ ] What metric cardinality is and how a route pattern controls it
- [ ] Liveness vs readiness, and the outage confusing them causes
- [ ] Why a health check must return the right status code, not just a body
- [ ] The four steps of graceful shutdown, and why it needs a hard timeout

---

## 12. Further reading

- [Google SRE Book — Monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/) (the four golden signals)
- [pino](https://getpino.io/) — the structured logger to use in production
- [prom-client](https://github.com/siimon/prom-client) — Prometheus metrics for Node
- [Kubernetes — Configure liveness and readiness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [OpenTelemetry for JavaScript](https://opentelemetry.io/docs/languages/js/)

**Next:** [Backend Final Project](../final-project/README.md) — everything so
far, against your real PostgreSQL database.
