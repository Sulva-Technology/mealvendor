# Meal Direct — Vendor Portal

Next.js 15 (App Router) + React 19 PWA for food vendors on the Meal Direct
campus ordering platform. Vendors manage orders, batches, menu + schedules,
inventory, availability, settlements, payouts, reviews, and notifications.

The portal is a pure frontend — all data comes from the Meal Direct backend
(NestJS) over a token-authenticated REST API. There is no local database and no
mock layer.

## Stack

- Next.js 15 App Router, React 19, TypeScript
- TanStack Query (server state) + Zustand (auth session, persisted)
- Tailwind CSS v4
- Zod-validated env (`src/lib/env.ts`)
- PWA: manifest + service worker (`public/sw.js`) with `/offline` fallback

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set at least `NEXT_PUBLIC_API_BASE_URL`
   to point at the backend.
3. Start the dev server:
   ```
   npm run dev
   ```

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm run clean` — clear the Next.js build cache

## Auth

Login is email/password against `/auth/vendor/login`. Tokens are held in a
persisted Zustand store; the API client transparently refreshes on a 401. A
presence cookie (`md-vendor-auth`) lets the middleware gate routes; the real
authorization is the bearer token sent to the backend.
