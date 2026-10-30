# Sproutly

A mobile app that helps parents of young children (ages 5–9) build daily routines and confidence. Kids complete tasks and watch a unicorn avatar grow through five stages (egg → foal → growing → unicorn → alicorn) over 30 days. The parent is in control; the kid view is a confidence-first, never-punishing display.

> **Status (as of 2026-10-30):** V1 in active development, iOS-first, targeting TestFlight with a small group of parents.

## How it works

- **One app, two UI modes.** Parent UI (`app/(parent)/`) manages tasks and sees today's progress and insights. Kid view (`app/(kid)/`) runs on the same binary, typically on a shared iPad, and is locked behind a 4-digit exit PIN.
- **Tasks** have three categories (routine, chore, behavior), three time slots (morning, afternoon, evening), difficulty 1–3, and recurrence (daily, weekdays, custom, one-time).
- **Growth** is derived from `successful_days`; stage transitions play an evolution video. A missed day never makes tomorrow harder — the parent may be offered a simplified day.
- **AI insights** are parent-triggered cards (Claude), rate-limited, with the child's name pseudonymized.

See [`wiki/synthesis/v1-scope.md`](wiki/synthesis/v1-scope.md) for what is and isn't in V1.

## Tech stack

| Layer | Technology |
|-------|-----------|
| App | Expo SDK 54, React Native 0.81, React 19, Expo Router |
| Backend | Supabase (Postgres, Auth, Realtime) |
| REST API | Hono on Node (`packages/server`), Zod schemas + OpenAPI (`packages/api-contract`) |
| AI | Anthropic Claude API |
| Animation | Lottie, `expo-av` (evolution MP4s) |
| Tests | Vitest |

Supabase JS is used in the app for **auth and Realtime only**; product reads and writes go through the REST server. See [`wiki/synthesis/architecture.md`](wiki/synthesis/architecture.md).

## Repo layout

```
app/                  Expo Router screens: (first-launch), (parent), (kid)
src/
  domain/             Pure logic (recurrence, day-roll, kid screen state) — no IO
  hooks/ lib/         IO, Supabase client, time helpers, kid lock/mode
  ui/ theme/          UI primitives and design tokens
packages/
  server/             Hono REST API
  api-contract/       Zod schemas + committed openapi.yaml
supabase/             Migrations, seed, config, edge functions
wiki/                 Living project wiki (start at wiki/index.md)
docs/superpowers/     Dated design specs and plans
```

## Getting started

Prerequisites: Node.js, npm, [Supabase CLI](https://supabase.com/docs/guides/cli), and Xcode (iOS Simulator) or Expo Go on a device.

```bash
npm install                       # installs all workspaces

# 1. Local Supabase
supabase start                    # prints API URL, anon key, service role key, JWT secret

# 2. Environment
cp .env.example .env.local        # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
cp packages/server/.env.example packages/server/.env   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET

# 3. REST server (port 8787)
npm run server:dev

# 4. App
npm run ios                       # or: npm start
```

On a physical device, use your machine's LAN IP instead of `127.0.0.1` for the Supabase and API URLs. Google sign-in and deep-link redirect setup are documented in the comments of [`.env.example`](.env.example).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm start` / `ios` / `android` / `web` | Expo dev server |
| `npm run server` / `server:dev` | REST server (`server:dev` watches for changes) |
| `npm test` / `test:watch` | Vitest |
| `npm run generate:openapi` | Regenerate `packages/api-contract/openapi.yaml` from Zod schemas |

With the server running in non-production mode, `GET /openapi.yaml` serves the spec and `POST /dev/impersonate` mints a dev JWT for API clients.

## Project conventions

- "Today" is always the family's timezone — use `src/lib/time.ts`, never device-local or UTC dates.
- The kid view never shows failure states.
- Parent is the authority for family data; the kid view acts under the parent session.
- The wiki and code are co-authored: when behavior changes, update the relevant `wiki/` page and append to `wiki/log.md`. Agent rules live in [`CLAUDE.md`](CLAUDE.md).

## Documentation

- [`wiki/index.md`](wiki/index.md) — catalog of entities, concepts, and synthesis pages
- [`wiki/sources/product-brief.md`](wiki/sources/product-brief.md) — original product brief
- [`docs/superpowers/specs/`](docs/superpowers/specs) — dated design specs
