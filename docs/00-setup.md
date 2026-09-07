# Setup

Everything you need before starting, and what to do when something does not
work.

---

## 1. Prerequisites

| | Version | Check |
|---|---|---|
| **Node.js** | 20.11+ (22 LTS recommended) | `node --version` |
| **npm** | 10+ (ships with Node) | `npm --version` |
| **Git** | any recent | `git --version` |
| **PostgreSQL** | 14+ — needed from **backend stage 4** onwards | `psql --version` |

Install Node from [nodejs.org](https://nodejs.org) or, better, with a version
manager: [nvm](https://github.com/nvm-sh/nvm) on macOS/Linux,
[nvm-windows](https://github.com/coreybutler/nvm-windows) or `winget install
OpenJS.NodeJS.LTS` on Windows.

> Frontend stages 1–7 and backend stages 1–3 need **no database at all**. You
> can get a long way before installing PostgreSQL.

---

## 2. Install

```bash
git clone https://github.com/yasinmagn/FullStackTraining.git
cd FullStackTraining

npm run setup      # checks Node, creates .env from .env.example
npm install        # installs every workspace at once
npm test           # everything should pass
```

`npm install` takes a couple of minutes the first time. It is an npm workspaces
monorepo, so this is the *only* install you need — never `cd` into a stage and
install separately.

---

## 3. PostgreSQL

Needed from **backend stage 4** onwards.

### Option A — Local install

| OS | How |
|---|---|
| **Windows** | The [installer](https://www.postgresql.org/download/windows/) — includes pgAdmin. Remember the password you set for `postgres` |
| **macOS** | [Postgres.app](https://postgresapp.com/) (easiest), or `brew install postgresql@16 && brew services start postgresql@16` |
| **Linux** | `sudo apt install postgresql` then `sudo systemctl start postgresql` |

### Option B — Docker

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

### Option C — Managed, free tier

[Neon](https://neon.tech), [Supabase](https://supabase.com) or
[Railway](https://railway.app). They give you a connection string directly.

**Set `DATABASE_SSL=true` for all of these** — managed providers require TLS.

### Create the databases

```bash
createdb fullstack_training
createdb fullstack_training_test
```

Or from `psql`:

```sql
CREATE DATABASE fullstack_training;
CREATE DATABASE fullstack_training_test;
```

On Windows, `createdb` lives in `C:\Program Files\PostgreSQL\16\bin` — add it to
your PATH, or use pgAdmin.

---

## 4. Configure `.env`

```bash
npm run setup                 # creates .env if you do not have one
```

Then edit it:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/fullstack_training
TEST_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/fullstack_training_test
DATABASE_SSL=false
JWT_SECRET=<paste the output of the command below>
```

Generate a real secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### The rules

1. **`.env` is git-ignored and must stay that way.** Never commit real
   credentials.
2. **`.env.example` is the contract** — every variable, placeholder values only.
   Update it when you add a variable, so the next person knows what to supply
   without you sending credentials over Slack.
3. **`TEST_DATABASE_URL` must be a separate database.** The integration tests
   `TRUNCATE` tables. They require this variable explicitly and deliberately do
   **not** fall back to `DATABASE_URL` — there is no safe default for a
   destructive test suite. When it is unset, those suites skip.
4. **A real environment variable beats `.env`.** `dotenv` does not overwrite
   what is already set — correct, because production sets real env vars and a
   stale `.env` must never override them. If your edits seem to do nothing,
   check `echo $DATABASE_URL` first.

### Verify

```bash
npm run check:secrets
npm run db:setup
npm run api
curl localhost:3000/health/ready
```

---

## 5. Optional: a pre-commit hook

Makes it impossible to commit a credential by accident.

```bash
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
npm run check:secrets --silent || {
  echo ""
  echo "Commit blocked: a possible credential was found."
  echo "Fix it, or add a check-secrets:allow comment if it is genuinely a false positive."
  exit 1
}
EOF
chmod +x .git/hooks/pre-commit
```

On Windows use Git Bash, or create the file in your editor with LF line endings.

> Hooks live in `.git/`, which is not committed, so every developer sets this up
> themselves. For a team, use [husky](https://typicode.github.io/husky/) so the
> hook is installed automatically.

---

## 6. Editor

VS Code with these extensions covers everything:

- **ESLint** and **Prettier**
- **TypeScript** (built in — make sure it is using the workspace version)
- **PostgreSQL** (`ms-ossdata.vscode-pgsql`) for running the `.sql` files inline

---

## 7. Troubleshooting

### `npm install` fails

Delete and retry from a clean state:

```bash
rm -rf node_modules package-lock.json      # Windows: rmdir /s node_modules
npm install
```

Check `node --version` is 20.11+.

### `ECONNREFUSED` connecting to the database

PostgreSQL is not running, or not on the port you think.

```bash
pg_isready                       # macOS/Linux
# Windows: check Services for "postgresql-x64-16"
docker ps                        # if you used Docker
```

### `28P01 password authentication failed`

The password in `DATABASE_URL` is wrong. If the password contains special
characters, they must be **percent-encoded**: `@` → `%40`, `:` → `%3A`,
`/` → `%2F`.

### `3D000 database "..." does not exist`

```bash
createdb fullstack_training
```

### `ETIMEDOUT` with a managed provider

You almost certainly need `DATABASE_SSL=true`.

### `EADDRINUSE: port 3000 already in use`

Something else is on that port.

```bash
lsof -ti:3000 | xargs kill       # macOS/Linux
netstat -ano | findstr :3000     # Windows, then: taskkill /PID <pid> /F
```

Or just `PORT=3001 npm run api`.

### Tests are skipped rather than run

That is deliberate for the database-backed suites when `TEST_DATABASE_URL` is
unset. Set it and re-run.

For **exercise** suites, they ship as `describe.skip` so the repo is green
before you start. Change `describe.skip` to `describe` when you begin.

### `Migration ... has been modified since it was applied`

You edited a migration that had already run. **An applied migration is
immutable** — write a new one instead. In development you can reset:

```bash
npm run db:migrate:down --workspace backend-final-project   # step back one
# or drop and recreate the database
```

### Vitest hangs and never exits

Something is holding the event loop open — usually a database pool that was
never closed. Every suite here closes its pool in `afterAll`; if you add one,
do the same.

### Changes to `.env` seem to have no effect

A real environment variable is winning. `echo $DATABASE_URL` (or
`echo %DATABASE_URL%` on Windows) — if it prints something, that value is being
used, not the file.

---

## 8. Next

**[docs/curriculum.md](curriculum.md)** — how to work through the material.
