# Frontend setup (shadcn + Tailwind + TypeScript)

This Vite app now follows a **shadcn-compatible** layout.

## Why `src/components/ui`

shadcn/ui expects UI primitives under **`/components/ui`** (here: `src/components/ui`).

That path matters because:

1. The shadcn CLI installs components into `components/ui` by default
2. Imports like `@/components/ui/...` stay stable across the app
3. Demo snippets (`import Component from "@/components/ui/modern-login-signup"`) work without path rewrites

If this folder is missing, create it:

```bash
mkdir -p src/components/ui src/lib
```

## Already configured in this repo

- TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`
- Path alias `@` → `src`
- `components.json` (shadcn)
- `src/lib/utils.ts` (`cn` helper)
- `src/components/ui/modern-login-signup.tsx`

## Fresh setup (if starting over)

```bash
# TypeScript Vite app
npm create vite@latest frontend -- --template react-ts
cd frontend

# Tailwind v4
npm install tailwindcss @tailwindcss/vite
# add `@import "tailwindcss";` to src/index.css
# add `tailwindcss()` plugin + `@` alias in vite.config.ts

# shadcn
npx shadcn@latest init
# choose: TypeScript, path aliases, components in src/components

# This login component deps
npm install three lucide-react clsx tailwind-merge class-variance-authority
npm install -D @types/three
```

## Component routes

| Route | Uses |
|-------|------|
| `/` | Modern login (OTP + Google) |
| `/demo` | Same component demo |
| `/app` | Bold Brain (after auth) |
