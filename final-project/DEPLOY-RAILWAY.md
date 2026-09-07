# Deploying SooqOnline to Railway

Both services run on Railway in the **full-stack-training** project, alongside a
managed **PostgreSQL** database. Deploys are driven from GitHub: pushing to each
service's repo triggers an automatic build & deploy.

## Live services

| Service | Source repo | URL |
|---------|-------------|-----|
| Postgres | (Railway managed) | internal `postgres.railway.internal` |
| final-project-backend | `yasinmagn/final-project-backend` | https://final-project-backend-production-40d4.up.railway.app |
| final-project-frontend | `yasinmagn/final-project-frontend` | https://final-project-frontend-production-9542.up.railway.app |

## Environment variables

**Backend** (`final-project-backend`)
- `DATABASE_URL = ${{Postgres.DATABASE_URL}}` — reference to the Postgres service.
- `JWT_SECRET` — long random string (set in Railway, never committed).
- `PORT` — injected by Railway; the server listens on `process.env.PORT`.

**Frontend** (`final-project-frontend`)
- `NEXT_PUBLIC_API_URL = https://final-project-backend-production-40d4.up.railway.app`
  — baked in at build time so the browser/SSR calls the deployed API.

## How each service builds

- **Backend** — `railway.json` uses Nixpacks. `npm install` runs
  `postinstall: prisma generate`; the start command is
  `npx prisma migrate deploy && node src/server.js`, so schema migrations are
  applied on every deploy before the server boots.
- **Frontend** — `railway.json` uses Nixpacks; Next.js is built during the build
  phase and started with `npx next start` (binds to Railway's `$PORT`).

## Reproduce with the Railway CLI

```bash
# 1. Log in and link the project
railway login
railway link --project <PROJECT_ID>

# 2. Provision Postgres (if not already present)
railway add --database postgres

# 3. Backend service
railway add --service final-project-backend \
  --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --variables "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
railway domain --service final-project-backend           # get its public URL

# 4. Frontend service (point it at the backend URL)
railway add --service final-project-frontend \
  --variables "NEXT_PUBLIC_API_URL=https://<backend-domain>"
railway domain --service final-project-frontend

# 5. Deploy — either connect the GitHub repos (auto-deploy on push) or:
railway up --service final-project-backend    # from final-project/backend
railway up --service final-project-frontend   # from final-project/frontend
```

## Database migration

The schema is applied to the hosted Postgres by Prisma:

```bash
cd final-project/backend
# .env must contain the DATABASE_URL for the hosted DB
npx prisma migrate deploy      # apply committed migrations
node prisma/seed.js            # categories, 20 products, admin user
```

(The backend service also runs `prisma migrate deploy` automatically on each deploy.)

## Security

No credentials are committed. `JWT_SECRET` and the real `DATABASE_URL` live only in
Railway's variable store and in local, git-ignored `.env` files. Only
`.env*.example` placeholders are in the repos.
