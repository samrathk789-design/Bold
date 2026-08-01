# Bold

Login-first app for traders. **Phone OTP**, **Email OTP**, and **Gmail** — entry only after the code is verified.

## Subagents

Project agents in `.cursor/agents/`:

| Agent | Owns |
|-------|------|
| `otp-phone` | SMS OTP (Twilio) |
| `otp-email` | Email OTP (Resend / SMTP) |
| `login-ui` | Login page UI only |

## Run

```bash
npm run install:all
npm run dev
```

- App (login): http://localhost:5173  
- API: http://localhost:4000/api/health  

## Make real OTP delivery work

### Phone SMS (required for real texts)

1. Create a free account at [Twilio](https://www.twilio.com/console)
2. Copy **Account SID**, **Auth Token**, and a **From** phone number
3. Put them in `backend/.env`:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
EXPOSE_OTP_IN_RESPONSE=false
```

4. Restart the API. Send OTP from the login page — the SMS arrives on the phone. Paste the code to enter.

### Email

**Production / real Gmail inbox**

```bash
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Bold <onboarding@resend.dev>
```

Or SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

**Development (no keys):** email OTP uses an Ethereal preview link. The login page shows **Open email to copy your OTP**.

## Bold Brain (OpenRouter)

After login, chat with the trading coach at `/app`.

Set in `backend/.env` (never commit the real key):

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

API:

- `GET /api/brain/status` (auth)
- `POST /api/brain/chat` `{ message, history? }` (auth)

## Auth flow

1. Enter phone or email → **Send OTP**
2. Message is delivered (SMS / email)
3. Paste OTP → **Verify & enter**
4. JWT session issued only after a correct code

OTP codes are hashed in SQLite, expire, and have attempt limits. The code is **never** returned in the API unless `EXPOSE_OTP_IN_RESPONSE=true`.
