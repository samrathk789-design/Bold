# Bold

Trading guidance for beginners — **signals**, **journaling**, and **algo trading**.

## What's in this base

- **Landing page** — Bold brand hero
- **Login** — Phone OTP, Email OTP, Google (Gmail)
- **Backend API** — Express + SQLite + JWT sessions, hashed OTPs, rate limits
- **Workspace** — Live signals, journal CRUD, algo bot stubs

## Quick start

```bash
npm run install:all
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:4000/api/health  

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Auth notes

| Method | How it works |
|--------|----------------|
| Phone / Email OTP | `POST /api/auth/otp/start` → enter code → `POST /api/auth/otp/verify` |
| Google | Set `GOOGLE_CLIENT_ID` for real ID tokens. In **dev**, use Continue with Google (`dev:you@gmail.com`) |

In development, OTP codes are logged in the API console and returned as `debugOtp` when `EXPOSE_OTP_IN_RESPONSE=true`.

## API map

- `GET /api/health`
- `GET /api/auth/config`
- `POST /api/auth/otp/start` `{ channel: "phone"|"email", destination }`
- `POST /api/auth/otp/verify` `{ challengeId, code }`
- `POST /api/auth/google` `{ idToken }`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout`
- `GET /api/signals`
- `GET|POST /api/journal`
- `GET|POST /api/algos`

## Project layout

```
backend/   Express + TypeScript + SQLite
frontend/  Vite + React + TypeScript
```

## Next

After this base, paste your UI prompt / screenshots and we refine the product UI.
