---
name: bold-oauth-login
description: Implements Bold Google/Apple/GitHub Firebase sign-in, connecting popup, authMethod storage, and username routing. Use when working on login OAuth buttons, Firebase auth, AuthConnectingPopup, or the username step.
disable-model-invocation: true
---

# Bold OAuth Login

## When to use
Login provider buttons, Firebase wiring, connecting popup, username creation, or `authMethod` storage.

## Required flow
1. Button tap → open `AuthConnectingPopup` (connecting phase).
2. Firebase configured → `signInWithPopup` → `POST /api/auth/firebase` with idToken + provider.
3. Else (dev only) → `POST /api/auth/oauth/dev` with provider + email.
4. Success phase → navigate: `needsUsername` → `/username`, else `/app`.
5. Cancel (`auth/popup-closed-by-user`) → dismiss popup, stay on login.
6. Persist `authMethod` as `google` | `apple` | `github`.

## Key files
- `frontend/src/components/ui/modern-login-signup.tsx`
- `frontend/src/components/ui/AuthConnectingPopup.tsx`
- `frontend/src/lib/firebase.ts`
- `frontend/src/pages/Username.tsx`
- `backend/src/routes/auth.ts`
- `backend/src/services/auth.ts`
- `backend/src/services/firebase.ts`

## Rules
- Do not leave provider buttons visual-only.
- Do not skip username for new OAuth users.
- Do not commit Firebase private keys or real API secrets.
- Production must set `NODE_ENV=production`, strong `JWT_SECRET`, `ALLOW_DEV_OAUTH=false`.
