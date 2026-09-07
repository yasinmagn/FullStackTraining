# Backend Stage 2 — HTTP & Express

> **Goal:** understand HTTP well enough that Express looks like a convenience
> rather than a magic box — then build a properly structured Express app with
> middleware, routing and centralised error handling.

| | |
|---|---|
| **Time** | ~2.5 hours |
| **Prerequisites** | [Stage 1](../stage-1-node-fundamentals/LESSON.md) |
| **You will build** | The same API twice — once with `node:http`, once with Express — plus 22 integration tests |

---

## 1. Run it

```bash
cd backend/stage-2-http-express

npm run dev:raw   # http://localhost:3100  - no framework
npm run dev       # http://localhost:3000  - Express

npm test --workspace backend-stage-2-http-express
```

Try both with curl:

```bash
curl -i localhost:3100/api/tasks
curl -i -X POST localhost:3100/api/tasks -H 'content-type: application/json' -d '{"title":"Ship it"}'
curl -i -X PUT localhost:3100/api/tasks          # 405, with an Allow header
curl -s -X POST localhost:3100/api/tasks -H 'content-type: application/json' -d '{oops'
```

---

## 2. HTTP, in one page

Every request is a method, a path, headers, and optionally a body:

```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Content-Length: 27

{"title":"Learn HTTP"}
```

### Methods and their properties

| Method | Safe? | Idempotent? | Use for |
|---|---|---|---|
| `GET` | Yes | Yes | Read. **Never** change state |
| `POST` | No | **No** | Create, or an action that isn't a CRUD verb |
| `PUT` | No | Yes | Replace the whole resource |
| `PATCH` | No | No | Partial update |
| `DELETE` | No | Yes | Remove |

- **Safe** = does not change state, so a crawler may call it freely.
- **Idempotent** = calling it five times has the same effect as once. This is
  what makes a client's retry safe. `POST` is not idempotent, which is exactly
  why double-clicking Submit creates two records.

### Status codes worth knowing cold

| Code | Meaning | Use when |
|---|---|---|
| `200` | OK | A successful GET/PUT/PATCH |
| `201` | Created | POST created something. **Add a `Location` header** |
| `204` | No Content | Success with nothing to return (DELETE) |
| `400` | Bad Request | Malformed or failing validation |
| `401` | Unauthorized | Not authenticated — *you have not told me who you are* |
| `403` | Forbidden | Authenticated but not allowed — *I know who you are; no* |
| `404` | Not Found | No such resource |
| `405` | Method Not Allowed | Path exists, method doesn't. **Add an `Allow` header** |
| `409` | Conflict | Duplicate, or a state conflict |
| `413` | Payload Too Large | Body over your limit |
| `422` | Unprocessable | Well-formed but semantically wrong (many APIs use 400) |
| `429` | Too Many Requests | Rate limited |
| `500` | Internal Server Error | **Your** bug |
| `503` | Service Unavailable | A dependency is down |

The 401/403 distinction is worth memorising — it is the most commonly confused
pair in the list.

> **Rule:** a client error is 4xx and *not your fault*. A 5xx is a promise that
> you will investigate. Returning 200 with `{"error": "..."}` breaks every
> retry, cache and monitor between you and the user.

---

## 3. Without a framework

Read `src/rawServer.mjs`. It is ~120 lines, and every one is something Express
does for you.

### The body is a stream

```js
for await (const chunk of req) { chunks.push(chunk); }
const raw = Buffer.concat(chunks).toString('utf8');
```

`req` is a Readable stream, not an object with `.body`. HTTP delivers the body
in chunks and you assemble them.

**Note the size limit.** Without one, a single request can exhaust your
process's memory — the simplest denial-of-service there is.

### You set the headers yourself

```js
res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
```

Forget `content-type` and the browser guesses, sometimes as `text/plain`, which
makes the client's `response.json()` fail with an error that has nothing to do
with the real problem.

### There is no router

`req.url` is a string containing path *and* query string. Every `if` in that
file is a route Express would have declared — and a real router also handles
trailing slashes, URL decoding, and method-not-allowed.

### One missed error hangs the request forever

If nothing calls `res.end()`, the client waits until it times out. No error
page, no 500 — just a spinner. That is why a framework's error handler is a
genuine feature.

---

## 4. Middleware is the whole idea of Express

```js
(req, res, next) => { /* do something, then */ next(); }
```

Requests flow through middleware in **registration order**. Each either responds
or calls `next()`.

```
request → logger → express.json() → router → notFoundHandler → errorHandler → response
```

**Order is not a style choice — it is the routing algorithm.** There is a test
asserting that a route registered *after* `notFoundHandler` can never be
reached. That is a real bug people hit by appending a route to the bottom of a
file.

### Body parsing is opt-in

```js
app.use(express.json({ limit: '100kb' }));
```

Without this, `req.body` is `undefined` — the most common "why is my POST body
empty" question there is. The `limit` is a security control, not a nicety.

### Routers keep files small

```js
const router = express.Router();
router.get('/', handler);
app.use('/api/tasks', router);
```

A Router is a mini-app with its own middleware stack, mountable under a prefix.

---

## 5. Error handling

### Throw typed errors; translate once, at the edge

```js
export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
  static notFound(message) { return new HttpError(404, message); }
}
```

Returning `res.status(404).json(...)` from deep inside a service couples your
business logic to HTTP. Throw a typed error and let **one** handler at the edge
decide how it becomes a response — which is also what makes that logic reusable
from a CLI or a queue worker.

### The error handler is identified by arity

```js
app.use((error, req, res, next) => { ... });   // 4 args = error handler
```

Drop `next` and it silently becomes ordinary middleware that never runs. That is
why the parameter is `_next` rather than omitted.

**Register it last.**

### Never leak internals on a 5xx

```js
message: status >= 500 ? 'Internal server error' : error.message
```

A stack trace tells an attacker your directory layout, your dependency versions
and often your database schema. **Log the detail; return a generic message.**

There is a test for exactly this: a route that throws
`connection to db-primary.internal:5432 refused` must produce a response body
containing none of that, while the full detail *is* logged with the request id.

### Express 5 handles async errors

```js
router.get('/:id/slow', async (req, res) => {
  await something();
  throw HttpError.notFound('...');    // ← forwarded automatically
});
```

In Express 4 this hung the request forever, which is why every codebase carried
an `asyncHandler(fn)` wrapper or `express-async-errors`. **Express 5 forwards
rejected promises to the error handler.** The wrapper is obsolete, and there is
a test proving it.

---

## 6. Request ids

```js
req.id = req.get('x-request-id') ?? randomUUID();
res.setHeader('x-request-id', req.id);
```

Honouring an upstream id means one trace id follows a request across services.
Returning it in the error body means a user can quote it in a bug report and you
find the exact log line.

This is cheap to add on day one and painful to retrofit.

---

## 7. Structured logging

```js
logger.log(JSON.stringify({ level, requestId, method, path, status, durationMs }));
```

JSON, not prose. A log aggregator can filter and aggregate structured logs; it
can do very little with `Got request for /api/tasks and it took a while`.

Note the log is written on the response's `finish` event — you cannot know the
status or duration until the response has actually been sent.

---

## 8. Testing with supertest

```js
const response = await request(app).get('/api/tasks').expect(200);
```

`request(app)` drives the app **in-process**: no port bound, no server to tear
down, no race with a previous test's socket. It exercises the real middleware
stack, the real router and the real error handler — which is where the bugs
actually are.

This is why `createApp()` returns the app without calling `listen`. Separating
"build the app" from "bind a port" is the single most valuable structural
decision in an Express codebase.

Tests worth reading in `src/app.test.mjs`:

- malformed JSON → **400**, not 500 (the client is at fault)
- a 200KB body against a 100KB limit → **413**
- an id echoed from `x-request-id` all the way into the error body
- exactly one structured log line per request

---

## 9. Graceful shutdown, now with connections to drain

`src/server.mjs` extends Stage 1's signal handling:

```js
server.close(() => process.exit(0));            // stop accepting, drain in-flight

const forceExit = setTimeout(() => process.exit(1), 10_000);
forceExit.unref();                              // don't let the timer hold the process open
```

The timeout is the important half. A hung request must not block the deploy
forever — SIGKILL is coming either way, and you would rather exit on your own
terms with a log line.

---

## 10. Exercises

### Exercise 1 — `PATCH /api/tasks/:id`
Support partial updates. Return 404 for an unknown id, 400 for an unknown field.
*Why PATCH and not PUT? What would PUT have to do with omitted fields?*

### Exercise 2 — 405 in Express
The raw server returns 405 with an `Allow` header. Express returns 404. Add
`router.all('/', ...)` at the end of the router to fix it.

### Exercise 3 — A timing middleware with a threshold
Log a warning for any request over 200ms. Add an artificially slow route to
prove it fires.

### Exercise 4 — Content negotiation
Return CSV when `Accept: text/csv`, JSON otherwise. Use `res.format()`.

### Exercise 5 — Break the error handler
Remove the fourth parameter from `errorHandler`. Watch every error become a
hung request, and confirm you now recognise the symptom.

### Exercise 6 — Prove the async fix
Add a route that rejects a promise. Confirm it 500s. Then, to see what Express 4
was like, wrap it so the rejection is swallowed and watch the request hang.

---

## 11. Checklist

- [ ] Which methods are safe, which are idempotent, and why retries depend on it
- [ ] 401 vs 403, and when to use 405 and 409
- [ ] Why the request body arrives as a stream, and why it needs a size limit
- [ ] Why middleware order is the routing algorithm
- [ ] Why `express.json()` is opt-in
- [ ] Why the error handler needs four parameters
- [ ] Why a 5xx response must never contain a stack trace
- [ ] Why `createApp()` does not call `listen`
- [ ] What `server.close()` does, and why it needs a timeout

---

## 12. Further reading

- [MDN — HTTP overview](https://developer.mozilla.org/docs/Web/HTTP/Overview)
- [MDN — HTTP status codes](https://developer.mozilla.org/docs/Web/HTTP/Status)
- [Express 5 — Migration guide](https://expressjs.com/en/guide/migrating-5.html)
- [Express — Error handling](https://expressjs.com/en/guide/error-handling.html)

**Next:** [Stage 3 — REST API Design](../stage-3-rest-api-design/LESSON.md)
