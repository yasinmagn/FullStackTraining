# Backend Stage 3 — REST API Design

> **Goal:** design an API a client can actually use, and structure the code so
> business rules survive contact with the framework.

| | |
|---|---|
| **Time** | ~3 hours |
| **Prerequisites** | [Stage 2](../stage-2-http-express/LESSON.md), frontend [Stage 3](../../frontend/stage-3-typescript/LESSON.md) for TypeScript |
| **You will build** | A layered Task API with zod validation, filtering, sorting and pagination — **46 passing tests** |

---

## 1. Run it

```bash
npm run dev  --workspace backend-stage-3-rest-api-design   # http://localhost:3000
npm test     --workspace backend-stage-3-rest-api-design
npm run typecheck --workspace backend-stage-3-rest-api-design
```

```bash
curl 'localhost:3000/api/tasks?status=todo&sort=priority&order=asc'
curl -X POST localhost:3000/api/tasks -H 'content-type: application/json' -d '{"title":"Ship it"}'
curl -X PUT  localhost:3000/api/tasks           # 405, with an Allow header
curl 'localhost:3000/api/tasks?pageSize=999999' # 400
```

---

## 2. Layered architecture

```
        HTTP layer          src/http/          parse, status codes, headers
            ↓
        Service layer       src/service/       BUSINESS RULES
            ↓
        Repository          src/repository/    data access, behind an interface
            ↓
        Domain              src/domain/        types, schemas, pure rules
```

Dependencies point **inwards**. The domain knows nothing about anything else.

The single most useful thing to notice is what each file does *not* import:

| Layer | Never imports |
|---|---|
| `domain/` | express, pg, anything |
| `service/` | express, pg, zod |
| `repository/` | express |
| `http/` | — (it is the edge) |

`taskService.ts` has no `req`, no `res`, no status codes. That is why
`taskService.test.ts` runs with no server and no database — and why the same
service could be driven by a CLI, a queue consumer or a scheduled job without
being rewritten.

### Why not just put it all in the route handler?

Because rules in a route handler are unreachable from anywhere that is not an
HTTP request. The first time you need "the same validation, but from a CSV
importer", you either duplicate the logic or refactor under pressure.

---

## 3. Resource design

### Nouns, not verbs

```
GET    /api/tasks              ✓        POST /api/getTasks        ✗
POST   /api/tasks              ✓        POST /api/createTask      ✗
GET    /api/tasks/:id          ✓        POST /api/deleteTask      ✗
PATCH  /api/tasks/:id          ✓
DELETE /api/tasks/:id          ✓
```

The **method** is the verb. The path names a *thing*.

### Filters go in the query string

```
GET /api/tasks?status=todo        ✓  a filtered view of one collection
GET /api/tasks/todo               ✗  reads as "the task whose id is todo"
```

The second collides the moment you add `/api/tasks/:id` — and it will.

### PATCH, not PUT

`PUT` means "replace the whole resource", so a `PUT` that omits `description` is
asking you to *clear* it. Almost every API that says PUT actually implements
PATCH semantics, and then surprises someone.

Use `PATCH` for partial updates and mean it.

### Consistent envelopes

```jsonc
// single
{ "data": { "id": "...", "title": "..." } }

// collection
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 } }

// error
{ "error": { "code": "NOT_FOUND", "message": "Task abc was not found", "requestId": "..." } }
```

Returning a bare top-level array leaves nowhere to add pagination later without
a breaking change. The envelope costs one key now and saves a version bump
later.

There is a test asserting that **every** failure — 400, 404, 409, 405 — uses the
same shape. That is what lets a client write one error handler instead of four.

### `code` is for machines, `message` is for humans

Clients branch on `error.code`. `message` may be reworded, translated or
improved without breaking anyone. Get this backwards and every copy edit is a
breaking change.

---

## 4. Validation with zod

### `.parse` at the edge, typed everything after

```ts
const query = listTasksQuerySchema.parse(req.query);
```

`.parse` throws a `ZodError`, which the error handler turns into a 400 listing
every bad field. What comes back is fully typed **and has defaults applied**, so
the service never has to deal with "page size not set".

### Everything in a query string is a string

```ts
page: z.coerce.number().int().positive().default(1)
```

`z.coerce` converts before validating. Without it, `?page=2` fails a
`z.number()` check, which is a confusing 400 to debug.

### A maximum page size is a security control

```ts
pageSize: z.coerce.number().int().positive().max(100).default(20)
```

Without the cap, `?pageSize=1000000` lets any client ask your database for
everything at once. That is a denial-of-service you built yourself, and there is
a test for it.

### Mass assignment

```ts
// The client sends this:
{ "title": "Echo", "id": "i-choose-this", "status": "done", "createdAt": "1999-01-01" }
```

`createTaskSchema` does not include `id`, `status` or `createdAt`, so zod
**strips them**. The client cannot set fields the server owns.

This is the **mass assignment** vulnerability, and it is how "regular user
promotes themselves to admin" happens: `User.update(req.body)` with a `role`
column. Validate against an explicit allow-list, always.

### The `.partial()` trap — read this one twice

The obvious way to write the update schema is wrong:

```ts
// ✗ Looks right. Is not.
export const updateTaskSchema = createTaskSchema.partial();
```

`.partial()` marks fields optional but does **not** remove their `.default()` or
`.transform()`. So:

```ts
createTaskSchema.partial().parse({})
// → { priority: 'medium', description: null, dueDate: null }
```

Three consequences:

1. The "at least one field" check can never fire, because the object is never
   empty.
2. `PATCH {}` silently **nulls out the description**.
3. Every PATCH resets priority to `medium`.

The fix is to share the **field validators** and write each operation's schema
explicitly (see `src/domain/task.ts`). Deriving *types* is good; deriving
*parsers* across operations with different defaults is a trap.

### Reject the empty patch

```ts
.refine((value) => Object.keys(value).length > 0, {
  message: 'Provide at least one field to update',
})
```

An empty patch is almost always a client bug — a form that sent nothing, or a
field name that got renamed. Returning 200 hides it.

---

## 5. The repository interface

```ts
export interface TaskRepository {
  list(query: ListTasksQuery): Promise<Page<Task>>;
  findById(id: string): Promise<Task | null>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  // ...
}
```

The seam between "what the application needs" and "where the data happens to
live". The service depends on this interface and never imports `pg`.

**Every method is async even though the in-memory version is synchronous.** The
interface must be shaped for the *slowest* implementation, or swapping in a real
database becomes a breaking change at every call site.

Stage 5 writes a PostgreSQL implementation of this exact interface, and the
service does not change by a single line.

### `find*` vs `get*`

```ts
repository.findById(id)   // Task | null   - it may not be there
service.getById(id)       // Task          - it must be there, or throw
```

A convention worth adopting. Callers of `getById` never need a null check, and
the 404 is produced in exactly one place.

---

## 6. Errors: domain in, HTTP out

```ts
// domain/errors.ts — no status codes anywhere
export class NotFoundError extends DomainError { }
export class ConflictError extends DomainError { }
```

```ts
// http/errorHandler.ts — the ONLY place the mapping lives
if (error instanceof NotFoundError) return res.status(404).json(...);
if (error instanceof ConflictError) return res.status(409).json(...);
```

`NotFoundError` means "the thing you asked for does not exist" — true whether
the caller is a web request or a CLI. The status code is a *presentation*
concern.

### 409 vs 400

| | Means |
|---|---|
| **400** | The request is malformed — wrong types, missing fields, bad enum |
| **409** | The request is *well-formed* but conflicts with current state |

A duplicate title is a 409. An invalid status transition is a 409. Sending
`priority: "urgent"` is a 400.

---

## 7. Pagination

```ts
const total = sorted.length;                    // AFTER filtering, BEFORE slicing
const start = (query.page - 1) * query.pageSize;
return { data: sorted.slice(start, start + query.pageSize), meta: { total, ... } };
```

`total` counts the **filtered result set**, not the page. Counting the page
instead breaks every pager in every client, and the test pins it.

> **Offset vs cursor.** Offset pagination (`?page=3`) is simple and fine for
> most admin UIs. It has two real problems at scale: `OFFSET 100000` makes
> PostgreSQL scan and discard 100,000 rows, and an insert between page loads
> shifts everything so a row can be seen twice or missed. Cursor pagination
> (`?after=<id>`) fixes both. Start with offset; know why you would move.

---

## 8. Sorting: an allow-list, not a passthrough

```ts
sort: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt')
```

Never interpolate a client-supplied column name into a query. `?sort=passwordHash`
is the polite version of what an attacker will try. The enum is the allow-list.

Also note nulls sort **last** in both directions when sorting by `dueDate`. "No
due date" is not "due in 1970".

---

## 9. 405 vs 404

```ts
router.all('/', (req, res) => {
  res.status(405).set('allow', 'GET, POST').json({ ... });
});
```

Registered after the specific methods, this catches "the path exists, the method
does not" — genuinely different information from "no such path", and the `Allow`
header tells the client what *would* work.

---

## 10. Test strategy

| Tested where | What | Cost |
|---|---|---|
| `taskService.test.ts` | Every business rule | Microseconds |
| `taskRoutes.test.ts` | Parsing, status codes, headers, envelopes | Milliseconds |

Business rules are tested **once**, at the cheapest layer. The HTTP tests only
check the translation. Testing every rule through HTTP means paying for JSON
serialisation and the whole middleware stack to assert something a pure function
could have told you — and that is how a suite ends up taking ten minutes.

---

## 11. Exercises

### Exercise 1 — Sub-resources
Add `GET /api/tasks/:id/comments` and `POST /api/tasks/:id/comments`.
*Should a comment be addressable at `/api/comments/:id` too? Argue both sides.*

### Exercise 2 — Cursor pagination
Add `?after=<id>` alongside `?page=`. Return `meta.nextCursor`.
*Note the trade-off you give up: no "page 7 of 12".*

### Exercise 3 — Bulk operations
`POST /api/tasks/bulk` accepting up to 50 tasks. Decide: all-or-nothing, or
per-item results? What status code does a partial success get?
*(`207 Multi-Status` exists. Whether it is a good idea is the exercise.)*

### Exercise 4 — Conditional requests
Add `ETag` on GET and honour `If-Match` on PATCH, returning `412` on mismatch.
*This is optimistic concurrency control: it stops two clients silently
overwriting each other.*

### Exercise 5 — OpenAPI from the schemas
Generate an OpenAPI document from the zod schemas (`zod-openapi`). One source of
truth for validation, types **and** documentation.

### Exercise 6 — Break the layering
Import `express` into `taskService.ts` and use `res.status(404)`. Watch
`taskService.test.ts` become impossible to write. Then revert.

---

## 12. Checklist

- [ ] Which layer each kind of logic belongs in, and what each must not import
- [ ] Why filters go in the query string and not the path
- [ ] Why `PATCH` and not `PUT` for partial updates
- [ ] What mass assignment is and how an explicit schema prevents it
- [ ] Why `.partial()` on a schema with defaults is a trap
- [ ] Why a maximum page size is a security control
- [ ] The difference between 400 and 409
- [ ] Why the repository interface is async even when the implementation is not
- [ ] Why `total` is counted after filtering but before slicing
- [ ] Why business rules are tested at the service layer, not through HTTP

---

## 13. Further reading

- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) — opinionated and genuinely useful
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [zod](https://zod.dev)
- [OWASP — Mass assignment cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)

**Next:** [Stage 4 — SQL & PostgreSQL](../stage-4-sql-postgres/LESSON.md)
