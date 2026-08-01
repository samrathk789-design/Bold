# AGENTS.md

Guidance for AI agents working in this repository.

## Project overview

Bold is a beginner-focused trading guidance web app: landing page, OTP/Google login, and a signed-in workspace with live signals, trade journal, and algo bot stubs.

- **Frontend:** Vite 8 + React 19 (`frontend/`) — http://localhost:5173
- **Backend:** Express + TypeScript + SQLite (`backend/`) — http://localhost:4000
- **API health:** `GET http://localhost:4000/api/health`

See `README.md` for the full API map and auth notes.

## Local development

```bash
npm run install:all
cp backend/.env.example backend/.env   # first-time only
npm run dev                            # both API + frontend
```

Run separately: `npm run dev:backend` / `npm run dev:frontend`.

## Lint and build

```bash
npm run lint --prefix frontend    # oxlint
npm run build --prefix backend    # tsc
npm run build --prefix frontend   # tsc + vite build
```

There is no automated test suite in this repo yet.

## Cursor Cloud specific instructions

### Services

| Service | Command | URL |
|---------|---------|-----|
| API + Frontend (combined) | `npm run dev` | Frontend http://localhost:5173, API http://localhost:4000 |
| Backend only | `npm run dev:backend` | http://localhost:4000 |
| Frontend only | `npm run dev:frontend` | http://localhost:5173 |

SQLite is embedded and migrates automatically on backend boot (`backend/data/bold.db`). No Docker, Redis, or external DB is required.

### First-time env file

Copy `backend/.env.example` to `backend/.env` before starting the API. `EXPOSE_OTP_IN_RESPONSE=true` (default in the example) exposes OTP codes in API responses and the login UI for E2E testing.

### Dev servers in tmux

Long-running dev servers should run in a tmux session (not a one-shot background shell):

```bash
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s bold-dev -c /workspace -- npm run dev
```

### E2E smoke test (no external secrets)

1. Open http://localhost:5173/login
2. Use Email OTP with any address (e.g. `demo@bold.dev`)
3. OTP appears in the UI as "Dev OTP: …" when `EXPOSE_OTP_IN_RESPONSE=true`
4. After login, `/app` shows live signals, journal, and algo sections
5. Journal entries require `symbol`, `side` (`BUY`/`SELL`), and `entryPrice` (number)

Google Sign-In works in dev without `GOOGLE_CLIENT_ID` via the "Continue with Google (dev)" mock button on the login page.

### Reset database

```bash
npm run db:reset --prefix backend
```
