# How to run — 04-auth-jwt

Express API (layered architecture, in-memory data). Requires **Node.js 18+**.

First create your `.env` from the example and set a long random `JWT_SECRET`
(never commit `.env`).

## Windows (PowerShell)
```powershell
cd modules\02-backend-api$d\solution
npm install
Copy-Item .env.example .env
# edit .env and set JWT_SECRET to a long random string
npm run dev
```

## macOS / Linux (Terminal)
```bash
cd modules/02-backend-api/04-auth-jwt/solution
npm install
cp .env.example .env
# edit .env and set JWT_SECRET to a long random string
npm run dev
```

Generate a secret quickly:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

API runs on **http://localhost:3000**. Admin login: `admin@sooqonline.local` / `admin1234`.
Stop with **Ctrl + C**.
