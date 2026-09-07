# Backend Stage 1 — Node Fundamentals

> **Goal:** the Node-specific knowledge that every later stage assumes —
> modules, the filesystem, configuration, and what happens when your process is
> asked to stop.

| | |
|---|---|
| **Time** | ~2 hours |
| **Prerequisites** | JavaScript (frontend [Stage 2](../../frontend/stage-2-javascript-essentials/LESSON.md) covers what you need) |
| **You will build** | A CLI that reads, validates and summarises JSON, with a config loader and graceful shutdown — 17 passing tests |

---

## 1. Run it

```bash
npm install                                              # once, from the repo root
npm run report --workspace backend-stage-1-node-fundamentals
npm test       --workspace backend-stage-1-node-fundamentals
```

Then try these directly:

```bash
cd backend/stage-1-node-fundamentals

node src/cli.mjs report data/tasks.json          # human-readable
node src/cli.mjs report data/tasks.json --json   # machine-readable
node src/cli.mjs report                          # usage error, exit code 2
node src/cli.mjs sleep 30                        # then press Ctrl-C
```

---

## 2. ES modules, and the things that disappear

This repo uses ESM everywhere (`"type": "module"`). Two habits:

### `node:` prefixed imports

```js
import { readFile } from 'node:fs/promises';   // ✓
import { readFile } from 'fs/promises';        // works, but ambiguous
```

The prefix says "builtin, not npm". It is unambiguous, resolves marginally
faster, and cannot be shadowed by a package that happens to be called `fs`.

### `__dirname` does not exist

```js
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const moduleDir = dirname(fileURLToPath(import.meta.url));
```

`import.meta.url` is a `file://` URL. Use `fileURLToPath` — a naive
`.replace('file://', '')` gives you `/C:/Users/...` on Windows and a genuinely
confusing `ENOENT`.

### Always join paths

```js
join(moduleDir, 'data', 'tasks.json')     // ✓ works everywhere
moduleDir + '/data/tasks.json'            // ✗ the reason tools break on Windows
```

You are developing on Windows. `path.join` is not optional.

---

## 3. Async: which API to use

Node's standard library has three generations of API. Use the newest.

| Style | Example | Verdict |
|---|---|---|
| Sync | `readFileSync` | **Blocks the event loop.** Startup config only, never in a request |
| Callback | `fs.readFile(p, cb)` | Legacy. Callback hell, no `await` |
| **Promise** | `fs/promises` | **Use this** |

```js
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const text = await readFile(path, 'utf8');
await sleep(300);
```

Node is **single-threaded for your JavaScript**. A synchronous read in a request
handler blocks *every* concurrent request, not just that one. That is the whole
reason the async API exists.

> **Top-level `await` works in ESM.** No `main().catch()` wrapper needed — see
> the bottom of `cli.mjs`.

---

## 4. Errors carry a `code`

```js
try {
  await readFile(path, 'utf8');
} catch (cause) {
  if (cause.code === 'ENOENT') throw new Error(`File not found: ${path}`, { cause });
  if (cause.code === 'EACCES') throw new Error(`Permission denied: ${path}`, { cause });
  throw cause;
}
```

Branch on `error.code`, never on `error.message` — messages change between Node
versions and are not an API.

### `cause` (ES2022)

```js
throw new Error(`${absolute} is not valid JSON`, { cause });
```

Wrap an error to add context **without losing the original**. Node prints the
chain, so you get your message *and* the underlying stack. Always pass `cause`
through; the alternative is a helpful message attached to a useless stack.

### Codes worth recognising

| Code | Means |
|---|---|
| `ENOENT` | No such file or directory |
| `EACCES` / `EPERM` | Permission denied |
| `EADDRINUSE` | Port already in use — you have another server running |
| `ECONNREFUSED` | Nothing listening (your database is not running) |
| `ETIMEDOUT` | The connection gave up |

You will meet the last three constantly in Stage 4 onwards.

---

## 5. Configuration: fail fast, at boot

`src/config.mjs` enforces one rule:

> **A missing environment variable must crash the process at startup, with a
> message naming the variable.**

The alternative — reading `process.env.WHATEVER` wherever you need it — fails at
3am, inside a request, as `undefined` propagating into a connection string. A
container that refuses to start is a page you can act on. A container that
starts and then quietly 500s is not.

### Environment variables are always strings

Three traps, all of which `config.mjs` closes:

```js
Boolean('false')          // true   ← ships to production regularly
Number('3 bananas')       // NaN
parseInt('3 bananas')     // 3      ← arguably worse
process.env.PORT || 3000  // '0' becomes 3000
```

Hence `intEnv`, `boolEnv`, and `??` rather than `||` throughout.

### The `.env` file

```bash
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows
```

`.env` is in `.gitignore`. **`.env.example` is the contract**: it lists every
variable with a placeholder value, so a new developer knows what to supply
without you sending them credentials over Slack.

Node 20.6+ can load it natively:

```bash
node --env-file=.env src/cli.mjs
```

Later stages use the `dotenv` package for wider compatibility. Either way, the
rule is the same: **real values live in `.env`, and `.env` is never committed.**

Run `npm run check:secrets` from the repo root — it fails the build if anything
credential-shaped reaches a tracked file.

---

## 6. Validate data from disk

`parseTasks` in `src/tasks.mjs` validates every field of a file that "you
control".

You do not control it. Someone edited it by hand, an old version of the tool
wrote it, or the process was killed mid-write and it is truncated. A file is
**external input**, exactly like an HTTP body.

Note that each error names the offending record:

```
Task 3 has an invalid status: DONE
```

not

```
TypeError: Cannot read properties of undefined
```

---

## 7. stdout vs stderr, and exit codes

```js
console.log(JSON.stringify(summary));   // stdout = DATA
console.error(`Environment: ${env}`);   // stderr = DIAGNOSTICS
```

This is what makes `node cli.mjs report --json | jq .total` work. Log a progress
message to stdout and you have corrupted your own output.

Exit codes are an API:

| Code | Means |
|---|---|
| `0` | Success |
| `1` | Something failed |
| `2` | Usage error (by convention) |

```js
process.exitCode = 1;   // ✓ lets pending stdout writes flush
process.exit(1);        // ✗ can truncate output mid-write
```

That truncation produces genuinely baffling bug reports. Prefer `exitCode`
unless you need to stop *right now*.

---

## 8. Process lifecycle

This section is why the stage exists. Run:

```bash
node src/cli.mjs sleep 30
```

…then press Ctrl-C.

### Graceful shutdown

```js
process.on('SIGTERM', handle);   // docker stop, Kubernetes, systemd
process.on('SIGINT',  handle);   // Ctrl-C
```

When a container is stopped the orchestrator sends **SIGTERM**, waits (typically
30 seconds), then sends **SIGKILL**, which cannot be caught. Those seconds are
yours to:

1. stop accepting new work
2. finish in-flight requests
3. close database connections
4. flush logs

**Ignore SIGTERM and every deploy drops the requests that were in flight.** This
is the single most common cause of "we see a spike of 502s during deploys".

Note the `shuttingDown` flag: an impatient operator pressing Ctrl-C twice should
not run your cleanup twice concurrently.

### Last-resort handlers

```js
process.on('uncaughtException', (error) => { log(error); process.exit(1); });
process.on('unhandledRejection', (reason) => { log(reason); process.exit(1); });
```

**Log and exit. Do not carry on.** After an uncaught exception the process is in
an unknown state — a promise half-resolved, a transaction half-committed. A
supervisor restarting a clean process beats a live process nobody can reason
about.

---

## 9. `parseArgs` — no dependency needed

```js
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: 'boolean', default: false } },
});
```

Stable since Node 20. For anything short of a real CLI framework, this removes
a dependency entirely.

---

## 10. Exercises

### Exercise 1 — `--status` filter
Add `node src/cli.mjs report data/tasks.json --status=todo`. Validate the value
and exit `2` with a helpful message if it is not a known status.

### Exercise 2 — A `write` command
`node src/cli.mjs add "New task" --priority=high` should append to the file.
*Read, modify, write — and think about what happens if the process is killed
between read and write. (The answer is: write to a temp file and `rename`,
which is atomic on POSIX.)*

### Exercise 3 — Stream a large file
Generate a 100MB JSON-lines file and process it with `node:readline` over a read
stream. Compare memory with `process.memoryUsage().heapUsed` against
`readFile`.
*This is the lesson streams exist to teach: constant memory instead of linear.*

### Exercise 4 — Config validation with zod
Rewrite `loadConfig` using zod (Backend Stage 3 introduces it). Compare the
error messages.

### Exercise 5 — Make shutdown fail
Make the cleanup in `sleep` throw. Confirm the exit code is `1`, then make it
hang forever and add a timeout that force-exits after 5 seconds.
*Real shutdown handlers need that timeout — a cleanup that hangs is worse than
one that fails.*

---

## 11. Checklist

- [ ] Why `__dirname` is missing in ESM and what replaces it
- [ ] Why `path.join` matters, especially on Windows
- [ ] Why a sync read in a request handler blocks every other request
- [ ] Why you branch on `error.code`, not `error.message`
- [ ] What `{ cause }` preserves
- [ ] Why config must be validated at boot, not at use
- [ ] Why `Boolean('false')` is a production bug
- [ ] What stdout, stderr and exit codes are each for
- [ ] What SIGTERM means and what you have to do about it

---

## 12. Further reading

- [Node — ES modules](https://nodejs.org/api/esm.html)
- [Node — `fs/promises`](https://nodejs.org/api/fs.html#promises-api)
- [Node — Process signal events](https://nodejs.org/api/process.html#signal-events)
- [The Twelve-Factor App — Config](https://12factor.net/config)

**Next:** [Stage 2 — HTTP & Express](../stage-2-http-express/LESSON.md)
