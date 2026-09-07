# Glossary

Terms used across the lessons, with the stage that covers each properly.

---

## Frontend

**Controlled input** — an input whose value comes from React state, with
`value` + `onChange`. The DOM cannot disagree with state. *(Frontend 5)*

**Derived state** — a value computable from other state or props. Compute it
during render; storing it creates a second copy that drifts. *(Frontend 4, 5)*

**Discriminated union** — a union whose members share a literal field the
compiler can narrow on. Replaces a bag of booleans where most combinations are
nonsense. *(Frontend 3)*

**Event delegation** — one listener on a parent handling events from many
children, relying on bubbling. Works for elements added later. *(Frontend 1)*

**Hydration** — attaching React to server-rendered HTML. Not used here; worth
knowing the word.

**Key** — React's identity for a list item across renders. Must be stable and
unique among siblings. Index keys make React reuse the wrong DOM node and
component state. *(Frontend 4)*

**Lifting state up** — moving state to the closest common ancestor of the
components that need it. *(Frontend 5)*

**Optimistic update** — applying a change to the UI before the server confirms,
then rolling back on failure. *(Frontend 6)*

**Prop drilling** — passing a value through components that do not use it, only
to reach a descendant. What context solves. *(Frontend 5)*

**Reducer** — a pure `(state, action) => newState` function. Testable with no
DOM. *(Frontend 5)*

**Selector** — a function deriving a slice from state. *(Frontend 5)*

**Server state** — data the server owns; your copy is a **cache**, not state.
Needs staleness, refetching, retries and invalidation. *(Frontend 6)*

**Stale-while-revalidate** — serve the cached value instantly, refetch in the
background. `staleTime` controls how long "fresh" lasts. *(Frontend 6)*

**Type predicate** — `value is T`, telling the compiler what a boolean *means*
so narrowing flows through `filter` and `if`. *(Frontend 3)*

---

## Backend

**Advisory lock** — a named lock PostgreSQL holds for you, released if the
process dies. Stops concurrent deploys migrating simultaneously. *(Backend 5)*

**Composition root** — the one place dependencies are wired together. Everything
else takes them as arguments. *(Backend 3, final project)*

**CORS** — a **browser** protection stopping another origin's JavaScript reading
your API with the visitor's cookies. Does nothing about curl, so it never
replaces authentication. *(Backend 6)*

**Idempotent** — calling it N times has the same effect as once. What makes a
client's retry safe. `GET`, `PUT`, `DELETE` are; `POST` is not. *(Backend 2)*

**Liveness vs readiness** — liveness asks "is this process broken?" (failure →
restart) and must **not** check dependencies. Readiness asks "can I serve
traffic?" (failure → remove from the load balancer) and should. *(Backend 7)*

**Migration** — an ordered, once-only schema change recorded in the database. An
applied migration is **immutable**. *(Backend 5)*

**N+1** — fetching a list, then one query per row. Each is fast; the round trips
are what hurt. *(Backend 4)*

**Parameterised query** — passing values separately from the SQL text, so they
never become part of the statement. Not escaping — a different mechanism, which
is why it cannot be got subtly wrong. *(Backend 5)*

**Pool** — a set of reusable database connections. A transaction needs a
**dedicated** client from it. A client that is never released is gone forever.
*(Backend 4, 5)*

**Repository** — the interface between "what the app needs" and "where the data
lives". Lets the service be tested with no database. *(Backend 3, 5)*

**Service layer** — where business rules live. Imports no framework and no
driver, so a CLI or a queue worker can call it. *(Backend 3)*

**SQLSTATE** — PostgreSQL's five-character error code. Branch on it, never on
the message. `23505` = unique violation → 409. *(Backend 4, 5)*

**Structured logging** — logging JSON objects rather than sentences, so an
aggregator can filter and alert on fields. *(Backend 7)*

**Transaction** — a group of statements that all commit or all roll back. State
on **one** connection. *(Backend 4, 5)*

---

## Security

**Broken access control** — OWASP #1. Authentication passed; authorisation was
never checked. *(Backend 6)*

**Cardinality (metrics)** — how many distinct label combinations a metric has.
Labelling by resolved path instead of route pattern creates one time series per
id. *(Backend 7)*

**CSRF** — tricking a browser into making an authenticated request using cookies
it attaches automatically. Relevant when you use cookies, not bearer tokens.
*(Backend 6)*

**IDOR** — Insecure Direct Object Reference: reading someone else's record by
changing an id. Survives testing because you test as the owner. *(Backend 6)*

**Mass assignment** — passing a request body straight into a model, letting a
client set fields the server owns (`role`, `ownerId`). Fixed by an explicit
allow-list schema. *(Backend 3, 6)*

**Salt** — random data mixed into a password hash, stored inside it, so two
users with the same password get different hashes. Defeats rainbow tables.
*(Backend 6)*

**Timing attack** — inferring a secret from how long a comparison takes. Why
login does the same work for an unknown email, and why `timingSafeEqual` exists.
*(Backend 6)*

**User enumeration** — learning which accounts exist, from different messages or
different response times. *(Backend 6)*

**XSS** — running attacker-supplied script in a victim's browser. `textContent`
over `innerHTML`; a Content-Security-Policy; and the reason `localStorage` is a
compromise for token storage. *(Frontend 1, Backend 6)*

---

## Testing

**Fixture** — known data a test starts from. Build it per test, not once at
module scope, or tests start depending on each other. *(Frontend 5, Backend 5)*

**Integration test** — exercises several real layers together. The
database-backed suites here are integration tests. *(Backend 5, final project)*

**Query priority** — Testing Library's ordering: role first, then label, then
text, with `getByTestId` last. Using roles makes the test an accessibility check
too. *(Frontend 7)*

**`getBy` / `queryBy` / `findBy`** — throws / returns null / retries and awaits.
`findBy*` is why a good suite contains no `sleep`. *(Frontend 7)*

**Test double** — a stand-in. Prefer **injecting** a dependency over mocking a
module: module mocks break on every refactor. *(Backend 7)*
