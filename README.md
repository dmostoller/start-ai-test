# Budget Board

A Trello-style board for personal cash flow. Describe money in plain English —
"Rent $1200 due on the 15th", "getting paid $2400 next Friday" — and the AI
assistant puts it on the board as a card. Drag cards between columns to track
what is paid and what has landed.

Built to the spec in [PLAN.md](./PLAN.md).

## Stack

| Layer       | Choice                                               |
| ----------- | ---------------------------------------------------- |
| Framework   | TanStack Start (Vite, file-based routing)            |
| Data        | Convex (schema, queries, mutations, live updates)    |
| AI          | TanStack AI + `@tanstack/ai-gemini`                  |
| Auth        | Better Auth (email/password + optional Google OAuth) |
| Forms       | TanStack Form + Zod v4                               |
| Drag & drop | dnd-kit                                              |
| Styling     | Tailwind CSS v4, light/dark themed with CSS vars     |
| Deploy      | Netlify preset (swap for Vercel — see below)         |

## Board shape

- **Expenses** swimlane: `upcoming` → `due` → `paid`
- **Income** swimlane: `expected` → `received`

Cards only move within their own lane. The rolling horizon (1 week … 1 year)
and the show/hide-completed toggle are per-user settings stored in Convex.

## Getting started

```bash
npm install
npx convex dev      # creates a deployment, fills CONVEX_DEPLOYMENT / VITE_CONVEX_URL
npm run dev         # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in:

| Variable                  | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `CONVEX_DEPLOYMENT`       | Written by `npx convex dev`                         |
| `VITE_CONVEX_URL`         | Convex deployment URL (browser **and** AI tools)    |
| `BETTER_AUTH_URL`         | App origin, e.g. `http://localhost:3000`            |
| `BETTER_AUTH_SECRET`      | `npx -y @better-auth/cli secret`                    |
| `GOOGLE_CLIENT_ID/SECRET` | Optional; enables the "Continue with Google" button |
| `GEMINI_API_KEY`          | Required for the AI assistant                       |
| `GEMINI_MODEL`            | Defaults to `gemini-2.5-flash`                      |

`npx convex dev` must stay running (or be run once with `--once`) for schema
changes in `convex/` to reach the deployment; it also regenerates
`convex/_generated/`.

## Scripts

| Script               | Does                       |
| -------------------- | -------------------------- |
| `npm run dev`        | Dev server on port 3000    |
| `npm run build`      | Production build           |
| `npm run typecheck`  | `tsc --noEmit`             |
| `npm run lint`       | ESLint                     |
| `npm run format`     | Prettier + `eslint --fix`  |
| `npm run convex:dev` | Convex dev/codegen watcher |

## How the AI writes to the board

`src/lib/ai-tools.ts` builds the tool set **per request**, closing over the
signed-in user's id so the model can never address another user's cards. The
tools (`createCard`, `updateCard`, `moveCard`, `deleteCard`, `listCards`,
`queryBalance`, `suggestCategory`) run server-side against Convex through
`ConvexHttpClient`, so a write made by the assistant streams straight back into
the board's live queries — no refetch, no optimistic patching.

The chat transcript is persisted to `localStorage` by the TanStack AI client
(`src/lib/ai-chat.ts`), so a reload or a dropped connection keeps the thread.

## Layout

```
convex/
  schema.ts       cards, categories, settings
  cards.ts        list / get / create / update / move / remove / repeat / stats
  categories.ts   default + custom categories
  settings.ts     horizon and show-completed, per user
src/
  lib/board.ts        shared lane/column/format vocabulary
  lib/ai-tools.ts     server-side AI tools over Convex
  lib/ai-chat.ts      client chat hook (SSE + persistence)
  components/board/   Board, Column, BoardCard, CardDialog, StatsBar, AISidebar
  routes/             / (board), /signin, /api/ai/chat, /api/auth/$
```

## Deploying to Vercel

The project was scaffolded with the Netlify preset because the TanStack CLI does
not offer Vercel yet. To move it:

1. `npm rm @netlify/vite-plugin-tanstack-start`, drop `netlify()` from
   `vite.config.ts`, and delete `netlify.toml`.
2. Add the Vercel preset per the TanStack Start deployment docs.
3. Set the same environment variables in the Vercel project, and point
   `BETTER_AUTH_URL` (plus the Google OAuth redirect URI) at the deployed
   origin.

## Before production: give Better Auth a database

Better Auth is running on its default in-memory store, which is fine locally but
drops every account when the server restarts. Pick a database and pass it to
`betterAuth()` in `src/lib/auth.ts` — for Postgres:

```bash
npm i pg
```

```ts
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  // …rest unchanged
})
```

then run `npx @better-auth/cli migrate` to create the auth tables.

Related: Convex functions take `userId` as an argument and scope every read and
write to it. Server-side callers (the AI tools) pass the verified session id,
but a determined browser client could pass another id. Wiring
`@convex-dev/better-auth` so Convex verifies the session itself is the hardening
step — it needs a live Convex deployment to install, so it is left as the first
follow-up.

## Not in V1

Recurring auto-generation (the `cards.repeat` mutation exists but nothing
schedules it), email/push notifications, budget goals, CSV export and shared
boards — see the end of [PLAN.md](./PLAN.md).
