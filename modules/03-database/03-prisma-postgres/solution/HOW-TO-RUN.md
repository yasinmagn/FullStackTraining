# How to run — Prisma + Postgres

Requires **Node.js 18+** and a reachable **PostgreSQL** database.

Set your connection string first (never commit `.env`):

## Windows (PowerShell)
```powershell
cd modules\03-database\03-prisma-postgres\solution
npm install
Copy-Item .env.example .env
# edit .env and set DATABASE_URL to your Postgres connection string
npx prisma migrate dev --name init
node prisma/seed.js
npx prisma studio        # optional: browse the data
```

## macOS / Linux (Terminal)
```bash
cd modules/03-database/03-prisma-postgres/solution
npm install
cp .env.example .env
# edit .env and set DATABASE_URL to your Postgres connection string
npx prisma migrate dev --name init
node prisma/seed.js
npx prisma studio        # optional: browse the data
```

`DATABASE_URL` format:
`postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
