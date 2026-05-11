# REST API Cutover — Design

**Date:** 2026-05-11
**Status:** Approved for planning
**Depends on:** `2026-05-10-flexible-device-roles-design.md` (must land first — this spec assumes no `server/`, no kid JWT, no pairing, one authenticated principal: the parent)

## Problem

Business rules live in the app. Day-roll math, task-completion idempotency, insight rate-limiting, stage progression, and pseudonymization are all either on-device (in `src/domain/` and screens) or spread across a Supabase edge function. Three consequences:

- Any client bug or re-implementation (future web admin, for instance) re-implements the rules.
- The app ships the Supabase anon key plus direct table access, so "the rules" are really just "the rules the app happens to enforce before writing."
- The flexible-device-roles cutover accepted the risk of having no server-side enforcement layer, on the explicit note that the REST cutover would restore it.

## Goal

Centralize all business rules and data access behind a trusted REST server. The app keeps Supabase SDK usage for **auth (magic-link) and Realtime subscriptions only**. Every other read and write goes through typed REST endpoints. A single Zod-based contract package is the source of truth for request/response shapes and generates an OpenAPI spec importable into Insomnia (and any other OpenAPI-aware tool).

## Scope

### In scope

- New standalone Node REST server (`packages/server`), rebirth of the deleted `server/`. Hono + TypeScript.
- New shared contract package (`packages/api-contract`) with Zod schemas per endpoint; generates `openapi.yaml`.
- Full inventory of endpoints covering every current `supabase.from(...)` / `supabase.rpc(...)` call site in `app/` and `src/`.
- Auth middleware that verifies the Supabase access token forwarded by the app.
- Service-role DB access with explicit `family_id` scoping on every query; parent RLS stays on as defense-in-depth.
- Absorb the `generate-insight` Supabase edge function into `POST /insights/generate` on the REST server.
- Typed fetch client in the app (`src/lib/api.ts`) with token injection, 401-refresh-retry, typed `ApiError` surface.
- Phased cutover: scaffold + one resource per PR, never a big-bang swap.
- Dev-only `POST /dev/impersonate` endpoint for manual testing (gated by `NODE_ENV !== 'production'`).
- Insomnia-importable API workspace via committed `openapi.yaml` generated from Zod; CI check that keeps it honest.
- npm workspaces at repo root (new); app stays at `app/` + `src/`, new packages live under `packages/`.

### Out of scope

- Server deploy pipeline / hosting choice (Fly/Render/etc.). Spec assumes a single Node process; concrete ops landing is a follow-on.
- Proxying Supabase Realtime through the REST server. Realtime subscription stays on the SDK in the app.
- Proxying Supabase Auth through the REST server. Magic link stays on the SDK.
- Removing the Supabase anon key from the app bundle. Realtime + auth need it; punted.
- ORM (drizzle / kysely / prisma). `supabase-js` service-role client is enough for V1.
- APM / OTel / structured log shipping. `console.log` is V1.
- Per-endpoint rate limiting beyond `POST /insights/generate`. Global IP limiting deferred until observed abuse.
- Non-TS consumers. OpenAPI is emitted, but there's no client SDK codegen in V1 for non-TS languages.
- Multi-child. Per current V1 invariants.

## Architecture

```
┌────────────────────┐                ┌─────────────────────┐
│   Sproutly app     │  magic link    │  Supabase Auth      │
│   (phone/iPad)     │───────────────▶│  (issues JWT)       │
│                    │                └─────────────────────┘
│  supabase-js for:  │                ┌─────────────────────┐
│   • auth           │   realtime     │  Supabase Realtime  │
│   • realtime sub   │───────────────▶│  (task_completions) │
│                    │                └─────────────────────┘
│  fetch() for:      │                ┌─────────────────────┐
│   • all data reads │  JWT in header │  REST server (Hono) │
│   • all writes     │───────────────▶│  /children /tasks … │
└────────────────────┘                │  service role → PG  │
                                      │  Claude API         │
                                      └─────────────────────┘
```

### Repo layout

```
sproutly/
├── app/                        # Expo app (structure unchanged)
├── src/
│   ├── lib/
│   │   ├── api.ts              # NEW: typed REST client
│   │   └── supabase.ts         # shrunk: auth + realtime only
│   ├── domain/                 # UI-side pure logic (kidScreenState etc.) stays here
│   └── …
├── packages/
│   ├── api-contract/
│   │   ├── src/
│   │   │   ├── schemas/        # Zod: Child, Task, TaskCompletion, …
│   │   │   ├── endpoints/      # one file per resource (request/response schemas + registerXxx)
│   │   │   ├── errors.ts       # error codes + shape
│   │   │   ├── openapi.ts      # generator entry: zod-to-openapi
│   │   │   └── index.ts
│   │   ├── openapi.yaml        # generated, committed
│   │   └── package.json
│   └── server/
│       ├── src/
│       │   ├── index.ts        # Hono app, middleware wiring, listen
│       │   ├── middleware/
│       │   │   ├── auth.ts     # verify Supabase JWT, load family_id
│       │   │   ├── validate.ts # Zod parse from api-contract
│       │   │   └── errors.ts   # maps thrown errors → JSON + status
│       │   ├── routes/         # one file per resource
│       │   ├── db/client.ts    # service-role supabase-js singleton
│       │   ├── domain/         # server-side pure logic (day-roll, stage progression, pseudonymization)
│       │   └── services/       # orchestrates domain + db (insights, completions, …)
│       └── package.json
├── supabase/…
└── package.json                # npm workspace root
```

`packages/api-contract` is a workspace dependency of both `app` (via tsconfig paths or workspace `*`) and `packages/server`. No build step required; TypeScript resolves across packages.

### Pure-logic split

- `src/domain/` keeps UI-derivation logic (`kidScreenState.ts`, etc.) — runs on device, consumes server data.
- `packages/server/src/domain/` holds server-authoritative logic: day-roll math, stage-bump rules, idempotency-key construction, insight rate-limit window math, pseudonymization.
- Where existing code in `src/domain/` is server-side logic (e.g., day-roll math), move it into `packages/server/src/domain/` as part of the relevant phase, not in a big refactor.

## Auth model

- App sends `Authorization: Bearer <supabase_access_token>` on every REST request.
- Server middleware:
  1. Extract bearer token. Verify HS256 with `SUPABASE_JWT_SECRET`.
  2. Read `sub` claim = `auth.uid()`.
  3. Look up the parent's `families` row (`parent_user_id = sub`); fetch `id` and `timezone`.
  4. Attach `{ user_id, family_id, timezone }` to the request context.
- No endpoint accepts `family_id` from the client. Every query in route handlers scopes through the context.
- Family lookup is per-request, not cached in V1. Optional 60s LRU if it becomes a measurable hit.
- **Refresh:** app's fetch wrapper catches 401, calls `supabase.auth.refreshSession()` once, retries. On second failure, signs out and routes to magic link.

## DB access

- Server uses a singleton `supabase-js` client created with `SUPABASE_SERVICE_ROLE_KEY`. RLS is bypassed.
- Every query in `routes/*.ts` MUST include `.eq('family_id', ctx.family_id)` (or a join that reaches it).
- Parent RLS policies (`0002_rls_parent.sql`) remain on the DB as defense-in-depth. Anon-key or user-JWT access paths stay fenced even though the server bypasses them.
- A CI lint test (see Testing) greps route handlers for `sb.from(` without a nearby `.eq('family_id'` to catch the common slip.

## Endpoint inventory

All endpoints require `Authorization: Bearer <supabase_access_token>` unless noted.

| Method | Path | Replaces | Notes |
|---|---|---|---|
| `GET` | `/health` | — | No auth. Returns `{ ok: true, version: <git-sha> }`. |
| `GET` | `/me` | `families.select().limit(1)` + onboarding probe | Bootstrap: `{ user_id, family_id, timezone, has_onboarded }`. |
| `PATCH` | `/me` | onboarding writes to `families` | Update timezone, display name. |
| `DELETE` | `/me` | account delete (future) | Cascades via DB `on delete cascade`. |
| `GET` | `/children` | `children.select(...)` | Parent's child roster (V1: 0 or 1). |
| `POST` | `/children` | onboarding `children.insert` | Create child. |
| `PATCH` | `/children/:id` | edit-profile updates | Partial update. Server validates avatar stage transitions. |
| `GET` | `/tasks` | `tasks.select(...)` | Active tasks for the family's child. |
| `POST` | `/tasks` | task-edit insert | Server validates recurrence shape, time slot, title. |
| `PATCH` | `/tasks/:id` | task-edit update | |
| `DELETE` | `/tasks/:id` | `is_active=false` soft delete | Soft delete preserved. |
| `GET` | `/task-completions?date=YYYY-MM-DD` | completion reads for today | Server computes "today" in family TZ if no date given. |
| `POST` | `/task-completions` | today tap + kid-view tap | **Rule-heavy.** Idempotent by `(task_id, local_date, child_id)`. Server stamps `local_date` from family TZ. |
| `DELETE` | `/task-completions/:id` | "unmark" if UI offers it | |
| `GET` | `/daily-summaries?from=&to=` | summary reads | Range read for insights/history. |
| `POST` | `/day-roll` | lazy client-side roll | **Rule-heavy.** Idempotent no-op if already rolled for today. Called on every foreground. Returns `{ rolled, summary? }`. |
| `GET` | `/insights?state=active` | `ai_insights.select(...)` | |
| `POST` | `/insights/:id/apply` | `ai_insights.update is_applied` | |
| `POST` | `/insights/:id/dismiss` | `ai_insights.update is_dismissed` | |
| `POST` | `/insights/generate` | `generate-insight` edge function | **Rule-heavy.** Enforces 20-hr per-family limit, pseudonymizes, calls Claude, writes row. Absorbs the edge function. |
| `GET` | `/cosmetics` | `cosmetics.select(...)` | Auth-gated. |
| `POST` | `/dev/impersonate` | — | **Dev only.** Gated by `NODE_ENV !== 'production'`. Request: `{ email }`. Response: `{ access_token }`. Returns a short-lived Supabase access token for manual Insomnia testing. |

**Gone, not replaced** (deleted by flexible-device-roles): `kid_devices` CRUD, `create_pairing_code` RPC.

**Edge function:** `generate-insight` is absorbed into `POST /insights/generate`. The edge function deploy target is removed in the same phase that ships the endpoint. `ANTHROPIC_API_KEY` moves from edge env to server env.

## Request / response contract

Source of truth: Zod schemas in `packages/api-contract/src/endpoints/*.ts`. Every endpoint exports:

- `XxxRequest` (Zod schema + inferred TS type)
- `XxxResponse` (Zod schema + inferred TS type)
- `registerXxx(registry)` — wires method + path + metadata for OpenAPI generation

Example:

```ts
// packages/api-contract/src/endpoints/task-completions.ts
import { z } from 'zod';

export const CreateTaskCompletionRequest = z.object({
  task_id: z.string().uuid(),
  child_id: z.string().uuid(),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const TaskCompletion = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  child_id: z.string().uuid(),
  local_date: z.string(),
  completed_at: z.string().datetime(),
});

export const CreateTaskCompletionResponse = z.object({
  completion: TaskCompletion,
  idempotent: z.boolean(),
});
```

Server: `CreateTaskCompletionRequest.parse(body)` rejects invalid input at the boundary (422).
App: `api.taskCompletions.create(req)` returns the parsed, typed response.

### Error contract

All non-2xx responses:

```json
{ "error": { "code": "VALIDATION", "message": "…", "fields": { "task_id": "required" } } }
```

Codes (in `api-contract/errors.ts`):

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing or invalid JWT. |
| `FORBIDDEN` | 403 | JWT valid but target resource not in caller's family. |
| `NOT_FOUND` | 404 | Target doesn't exist. |
| `CONFLICT` | 409 | Idempotency / duplicate. |
| `VALIDATION` | 422 | Zod parse failed. `fields` populated. |
| `RATE_LIMITED` | 429 | Insight generation window hit. |
| `INTERNAL` | 500 | Unhandled. |

App's fetch wrapper surfaces these as a typed `ApiError` with the same fields. Route-level handlers can `switch` on `err.code`.

## Client wrapper (`src/lib/api.ts`)

One thin wrapper that:
1. Pulls current access token from `getParentClient().auth.getSession()`.
2. `fetch(${BASE}/...)` with `Authorization` header and JSON body.
3. On 401, calls `supabase.auth.refreshSession()` once and retries. On second 401, signs out and routes to magic link.
4. On non-2xx, reads the error envelope and throws `ApiError`.
5. On 2xx, parses the body with the endpoint's response Zod schema; throws if the server responded with an unexpected shape.

Organized by resource: `api.me.get()`, `api.tasks.list()`, `api.taskCompletions.create(...)`, etc. Thin enough that each method is ~5 lines.

`EXPO_PUBLIC_API_URL` is the new env var (e.g., `http://<lan-ip>:8787` in dev).

## Insomnia / OpenAPI workspace

- `zod-to-openapi` runs in a `generate:openapi` script in `packages/api-contract`.
- Output: `packages/api-contract/openapi.yaml`, committed.
- CI step: run the generator; `diff` against the committed file; fail if they disagree. Keeps the spec in lockstep with schemas.
- Manual import path: Insomnia → Import → File → `packages/api-contract/openapi.yaml`. Imports every endpoint with example bodies and response schemas.
- Environment template (committed alongside the yaml or in the spec's `info` block): `{{ base_url }}`, `{{ bearer_token }}`. Users set once per environment (local/dev/prod).
- Server also serves `GET /openapi.yaml` in dev mode so Insomnia can pull by URL. Prod: disabled to avoid surface-area leak. Swagger UI is out of V1 scope.

Bearer token for manual testing: use `POST /dev/impersonate` (dev only, see below) or copy the session access token out of the running app.

## Dev-only impersonation

`POST /dev/impersonate`:
- Gated by `NODE_ENV !== 'production'`. When not dev, returns 404 (not 403 — avoid confirming the endpoint exists in prod).
- Request: `{ email: string }`.
- Implementation: server uses its service role key to fetch the user by email via Supabase Admin API (`auth.admin.listUsers` / `getUserByEmail`), then issues a short-lived Supabase access token for that user — either via Admin API's session-generation if available, or by signing an HS256 JWT with `sub = user.id`, `role = 'authenticated'`, and a short TTL (e.g., 1 hour).
- Response: `{ access_token: string, expires_at: string }`.
- Must refuse to issue tokens for users who aren't present in the `families.parent_user_id` column (no unrelated users).

## Cross-cutting concerns

### Day-roll & timezone

- `POST /day-roll` is authoritative for "today" using `family.timezone`.
- Endpoints that accept `local_date` validate it's within ±1 day of the server-computed today.
- Client never sends `local_date` when the default (server-computed today) is correct.

### Realtime interplay

- Realtime subscription on `task_completions` stays on Supabase SDK in the app.
- Server inserts via service role still trigger the Realtime broadcast (Supabase watches the table, not the caller). No wiring required.

### Rate limiting

- `POST /insights/generate`: one successful generation per family per 20 hours. Source of truth: `ai_generation_log` rows with `success = true` in the last 20 hours.
- No other per-endpoint limits in V1.

### Observability

- Structured `console.log`: `{ ts, level, method, path, status, ms, user_id, family_id, error? }`.
- `X-Request-Id` request/response header — generated if missing.
- Git SHA in `/health` response for deploy verification.
- No APM / OTel in V1.

### Local dev

- `npm run server:dev` — Hono + `tsx` watch on `:8787`.
- App `.env.local`: `EXPO_PUBLIC_API_URL=http://<lan-ip>:8787`.
- Reuse the existing LAN-IP warning pattern from `src/lib/supabase.ts` (physical device ≠ 127.0.0.1).

## Cutover strategy (phased)

No big-bang. Every phase ships independently and is revertible.

- **Phase A — Scaffold.** Add npm workspaces. Create `packages/api-contract` (empty registry + OpenAPI generator wired). Create `packages/server` (Hono app, auth middleware, `/health`, `/me`). Add `src/lib/api.ts` with only `api.me.get()`. App still uses Supabase directly everywhere else.
- **Phase B — per-resource migrations.** One PR per resource group. Each PR adds endpoints + schemas, swaps that resource's app call sites to `api.x.y()`, deletes the direct `supabase.from(...)` calls in the same diff. Order: `/me` → `/children` → `/tasks` → `/task-completions` → `/daily-summaries` → `/day-roll` → `/insights` → `/cosmetics`.
- **Phase C — absorb edge function.** Ship `POST /insights/generate`; app swaps; delete the `generate-insight` edge function deploy.
- **Phase D — cleanup.** Grep-check the app for any remaining `supabase.from(`. Add an optional runtime assertion in `getParentClient()` that disallows `.from(` access in production (punt if it adds noise). Supabase anon key stays in the app bundle (realtime + auth).

Each phase's PR includes:
- endpoint tests (route-level, mocked supabase)
- regenerated `openapi.yaml` (CI enforces)
- wiki updates in the same change (per CLAUDE.md)

## Wiki touches (in the same change as code)

Add:
- `wiki/entities/servers/rest-server.md` — new page replacing the deleted `wiki/entities/servers/server.md` (which went away with flexible-device-roles).
- `wiki/concepts/api-contract.md` — explains Zod → OpenAPI pipeline and how the client wrapper consumes it.

Update:
- `wiki/synthesis/architecture.md` — add REST server block to the diagram; note that app uses Supabase SDK for auth + realtime only.
- `wiki/synthesis/security-model.md` — add a row for the server's service role; note that parent RLS remains as defense-in-depth.
- `wiki/index.md` — add new pages.

Log entry per phase: `## [YYYY-MM-DD] add | rest api phase <X>: <what shipped>`.

## Testing

### Unit (Vitest)

- `packages/server/src/domain/**` — pure rules: day-roll math, idempotency key construction, insight rate-limit window, pseudonymization.
- `packages/api-contract/src/schemas/**` — sanity parse tests where validation rules are non-trivial (e.g., `local_date` regex, recurrence shape).

### Route tests (Vitest, in-memory Hono)

- Mock the supabase-js client.
- Each route: missing token → 401; valid token, cross-family resource → 403; malformed body → 422; happy path → 2xx + expected body.
- `/dev/impersonate`: returns 404 when `NODE_ENV === 'production'`.

### CI checks

- `npm run generate:openapi && git diff --exit-code packages/api-contract/openapi.yaml` — fails if schemas drifted from spec.
- Grep test: `grep -r "sb\.from(" packages/server/src/routes/` → every hit must have `.eq('family_id'` within N lines below. Implemented as a Vitest test that reads route files.
- `grep -r "supabase\.from(" app/ src/` in Phase D passes with zero results.

### Manual smoke (per phase)

Per-resource: migrate the resource, boot the app, exercise the flows the resource powers (onboarding, today screen, task edit, etc.).

## Risks

- **Service-role discipline.** The whole security model downstream of auth is "every query filters by `family_id`." The CI grep helps but is not bulletproof. Code review on route files is load-bearing.
- **Contract drift.** If a dev edits schemas without regenerating `openapi.yaml`, Insomnia goes stale. Mitigated by CI `diff` gate.
- **401 storms on expired tokens.** The refresh-once-retry path must work under Realtime reconnection pressure. Mitigated by single refresh attempt and falling back to sign-out rather than loops.
- **Phased cutover leaves mixed code paths.** For the duration of Phase B, some resources read from Supabase directly and others go through REST. Day-roll is particularly sensitive — aim to land `/day-roll` mid-way through B so the foreground trigger is stable before more flows depend on it.
- **Dev impersonation endpoint leak.** If `NODE_ENV` is misconfigured in prod, `/dev/impersonate` could mint tokens. Mitigated by default-denying env (not `NODE_ENV === 'development'`; explicitly `!== 'production'` with fallback to "off") and by refusing to issue tokens for users not present in `families.parent_user_id`.
- **Anon key still in bundle.** Realtime + auth require it; accepted for V1. Any future plan to remove requires proxying both through the server.

## Deliberate non-goals

- No server-side proxying of Supabase Realtime.
- No server-side proxying of Supabase Auth magic-link callbacks.
- No ORM.
- No API versioning scheme (e.g., `/v1/...`) in V1. One consumer, no breaking-change promise yet. Revisit when a second consumer appears.
- No GraphQL. REST is the mandate.
- No client SDK codegen for non-TS languages. Zod types are the TS SDK.
- No per-endpoint rate limiting beyond `/insights/generate`.

## Related

- `2026-05-10-flexible-device-roles-design.md` — prerequisite; removes `server/` and pairing.
- `2026-05-03-sproutly-foundations-design.md` — original architecture.
- `wiki/synthesis/architecture.md`
- `wiki/synthesis/security-model.md`
