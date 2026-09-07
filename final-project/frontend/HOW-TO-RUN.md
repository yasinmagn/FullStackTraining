# How to run — SooqOnline Next.js frontend (final project)

Next.js (App Router) + Tailwind. Requires **Node.js 18+**.

> **Start the API first.** This app talks to the backend at `http://localhost:3000`
> (see `final-project/backend/HOW-TO-RUN.md`). This frontend runs on **:3001** so it
> doesn't clash with the API.

Point it at a different API by copying `.env.local.example` to `.env.local` and
setting `NEXT_PUBLIC_API_URL`.

## Windows (PowerShell)
```powershell
cd final-project\frontend
npm install
Copy-Item .env.local.example .env.local   # optional (defaults to localhost:3000)
npm run dev
```

## macOS / Linux (Terminal)
```bash
cd final-project/frontend
npm install
cp .env.local.example .env.local           # optional (defaults to localhost:3000)
npm run dev
```

Open **http://localhost:3001**.

Full demo flow: browse → register → login → add to cart → checkout → see the order
in **My Orders** (stock decreases in the DB). Admin (`admin@sooqonline.local` /
`admin1234`) also sees an **Admin** page to manage products.

Stop with **Ctrl + C**.
