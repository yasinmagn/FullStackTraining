# How to run — SooqOnline API (final project backend)

Requires **Node.js 18+** and a reachable **PostgreSQL** database.

## 1. Configure secrets (never commit `.env`)

Copy the example and fill in your real values:

### Windows (PowerShell)
```powershell
cd final-project\backend
Copy-Item .env.example .env
```

### macOS / Linux (Terminal)
```bash
cd final-project/backend
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
  (`postgresql://USER:PASSWORD@HOST:PORT/DATABASE`).
- `JWT_SECRET` — a long random string. Generate one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

## 2. Install, migrate, seed, run

Same commands on Windows (PowerShell), macOS, and Linux:

```bash
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

The API starts on **http://localhost:3000**.
Admin login: `admin@sooqonline.local` / `admin1234`.

## 3. Quick check

Open **http://localhost:3000/products** in a browser — you should see the seeded
product catalog as JSON.

Optionally browse the data with Prisma Studio:
```bash
npx prisma studio
```

Stop the server with **Ctrl + C**.
