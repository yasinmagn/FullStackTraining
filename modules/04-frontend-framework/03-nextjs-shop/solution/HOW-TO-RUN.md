# How to run — Next.js app

A Next.js (App Router) + Tailwind app. Requires **Node.js 18+**.

> **Start the API first.** This app talks to `http://localhost:3000`. Run the
> final-project backend (or `modules/02-backend-api/04-auth-jwt/solution`) on
> port 3000 first. This app runs on **:3001** so it doesn't clash with the API.

Optionally point it at a different API by copying `.env.local.example` to
`.env.local` and setting `NEXT_PUBLIC_API_URL`.

## Windows (PowerShell)
```powershell
cd modules\04-frontend-framework$d\solution
npm install
Copy-Item .env.local.example .env.local   # optional
npm run dev
```

## macOS / Linux (Terminal)
```bash
cd modules/04-frontend-framework/03-nextjs-shop/solution
npm install
cp .env.local.example .env.local           # optional
npm run dev
```

Open **http://localhost:3001**. Stop with **Ctrl + C**.
