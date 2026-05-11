# REST API — Phase A: Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the REST server, shared contract package, typed app client, and Insomnia-importable OpenAPI pipeline. After this plan, the app uses REST for `GET/PATCH /me` only; every other data call still goes through Supabase SDK. Per-resource migrations (Phase B) are separate plans.

**Architecture:** npm workspaces at the repo root. `packages/api-contract` owns Zod schemas per endpoint and generates `openapi.yaml`. `packages/server` is a Hono app with JWT-verification middleware and service-role Supabase access. The app gains `src/lib/api.ts`, a thin typed fetch wrapper, consuming the contract package. `/health`, `/me` (GET/PATCH), and `/dev/impersonate` are live.

**Tech Stack:** TypeScript, Hono, Zod, `@asteasolutions/zod-to-openapi`, `@supabase/supabase-js` (service role on server; auth+realtime on app), `jsonwebtoken`, Vitest, tsx.

**Spec:** [`docs/superpowers/specs/2026-05-11-rest-api-design.md`](../specs/2026-05-11-rest-api-design.md)

**Prerequisite:** `2026-05-10-flexible-device-roles-design.md` must have shipped first. This plan assumes no `server/`, no kid JWT, no pairing. If those still exist, stop and finish flexible-device-roles first.

**Explicitly out of scope for this plan:**
- Any endpoint other than `/health`, `/me` (GET/PATCH), `/dev/impersonate`.
- Removing any existing `supabase.from(...)` call site except the one(s) replaced by `/me`.
- `POST /day-roll`, `/tasks`, `/children`, `/task-completions`, `/insights`, `/cosmetics`, `/daily-summaries`, `DELETE /me`. All Phase B+.
- Absorbing the `generate-insight` edge function. Phase C.
- Production deploy pipeline.

---

## File Structure

**New files**
- `packages/api-contract/package.json` — workspace package manifest.
- `packages/api-contract/tsconfig.json` — `"composite": true`, ESM/NodeNext.
- `packages/api-contract/src/index.ts` — barrel export.
- `packages/api-contract/src/errors.ts` — `ErrorCode` union + `ApiErrorBody` Zod schema.
- `packages/api-contract/src/schemas/common.ts` — shared primitives (`Uuid`, `LocalDate`, `Iso8601`).
- `packages/api-contract/src/endpoints/me.ts` — `GetMeResponse`, `PatchMeRequest`, `PatchMeResponse` + `registerMe(registry)`.
- `packages/api-contract/src/endpoints/dev.ts` — `ImpersonateRequest`, `ImpersonateResponse` + `registerDev(registry)`.
- `packages/api-contract/src/openapi.ts` — builds the OpenAPI registry, calls each `registerXxx`, writes `openapi.yaml`.
- `packages/api-contract/openapi.yaml` — **generated, committed.**
- `packages/api-contract/scripts/generate.ts` — entry for `npm run generate:openapi`.

- `packages/server/package.json` — workspace package, replaces the deleted `server/package.json` (Hono, not Express).
- `packages/server/tsconfig.json` — extends root; `"references"` to `../api-contract`.
- `packages/server/src/index.ts` — Hono app bootstrap + `listen`.
- `packages/server/src/env.ts` — parse and validate process env (throw on missing secrets).
- `packages/server/src/db/client.ts` — service-role supabase-js singleton.
- `packages/server/src/middleware/auth.ts` — verify Supabase JWT, load `family_id`, attach request context.
- `packages/server/src/middleware/errors.ts` — maps thrown `ApiError` / Zod errors to the error envelope.
- `packages/server/src/middleware/validate.ts` — tiny helper that parses request body/query with a Zod schema and throws `VALIDATION` on failure.
- `packages/server/src/lib/api-error.ts` — `ApiError` class (code, status, message, fields).
- `packages/server/src/routes/health.ts` — `GET /health`.
- `packages/server/src/routes/me.ts` — `GET /me`, `PATCH /me`.
- `packages/server/src/routes/dev.ts` — `POST /dev/impersonate` (404 when `NODE_ENV === 'production'`).
- `packages/server/src/routes/openapi.ts` — `GET /openapi.yaml` in dev; 404 in prod.
- `packages/server/test/health.test.ts` — route test.
- `packages/server/test/me.test.ts` — auth + happy-path tests.
- `packages/server/test/dev.test.ts` — 404-in-prod test; happy-path test.
- `packages/server/test/grep-family-scope.test.ts` — CI lint: every `.from(` in `routes/` has a nearby `.eq('family_id'`.
- `packages/server/vitest.config.ts` — test config scoped to this package.
- `packages/server/.env.example` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `PORT`, `NODE_ENV`.

- `src/lib/api.ts` — typed fetch client for the app. Exposes `api.me.get()`, `api.me.patch(...)`.
- `src/lib/api.test.ts` — wrapper tests: token injection, 401-refresh-retry, error envelope parsing, Zod response parsing.

**Modified files**
- `package.json` (root) — add `"workspaces": ["packages/*"]`, scripts `server`, `server:dev`, `generate:openapi`, `test`.
- `tsconfig.json` (root) — add `"references"` to both packages.
- `.gitignore` — allow `packages/api-contract/openapi.yaml` to be committed (already fine — `docs/` is gitignored, `packages/` is not).
- `.env.example` (root, app-facing) — add `EXPO_PUBLIC_API_URL=http://localhost:8787`.
- `src/lib/supabase.ts` — no code change in Phase A; stays as-is.
- `app/_layout.tsx` or `app/(first-launch)/parent-onboarding.tsx` — swap the single `families.select().limit(1)` bootstrap probe to `api.me.get()`. This is the only app-side behavior change in Phase A.
- `wiki/synthesis/architecture.md` — add a "REST server (Phase A live)" paragraph and refresh the diagram.
- `wiki/index.md` — add new pages.
- `wiki/log.md` — append the Phase A line.

**New wiki pages**
- `wiki/entities/servers/rest-server.md` — supersedes the deleted `wiki/entities/servers/server.md`. Documents `/health`, `/me`, `/dev/impersonate`, auth model, env.
- `wiki/concepts/api-contract.md` — Zod → OpenAPI pipeline and client wrapper flow.

**Deleted files** — none in this plan. `server/` was already deleted by flexible-device-roles.

---

## Task 1: Repo scaffolding — npm workspaces

**Files:**
- Modify: `package.json` (root)
- Modify: `tsconfig.json` (root)
- Create: `packages/api-contract/package.json`, `packages/api-contract/tsconfig.json`, `packages/api-contract/src/index.ts` (empty barrel)
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`, `packages/server/src/index.ts` (empty `console.log`)

- [ ] **Step 1: Add workspaces to root `package.json`**

Add `"workspaces": ["packages/*"]`. Add top-level scripts:
- `"server": "npm run start -w @sproutly/server"`
- `"server:dev": "npm run dev -w @sproutly/server"`
- `"generate:openapi": "npm run generate -w @sproutly/api-contract"`

- [ ] **Step 2: Create `packages/api-contract/package.json`**

Name `@sproutly/api-contract`, private, ESM. Scripts: `generate` (runs `tsx scripts/generate.ts`), `test`. Dependencies: `zod`, `@asteasolutions/zod-to-openapi`, `yaml`. Dev dependencies: `tsx`, `typescript`, `vitest`.

- [ ] **Step 3: Create `packages/server/package.json`**

Name `@sproutly/server`, private, ESM. Scripts: `start` (`tsx src/index.ts`), `dev` (`tsx watch src/index.ts`), `test` (`vitest run`). Dependencies: `hono`, `@hono/node-server`, `@supabase/supabase-js`, `jsonwebtoken`, `zod`, `yaml`, `@sproutly/api-contract` (workspace `*`). Dev dependencies: `tsx`, `typescript`, `vitest`, `@types/jsonwebtoken`, `@types/node`.

- [ ] **Step 4: TypeScript configs**

`packages/api-contract/tsconfig.json`: `composite: true`, `declaration: true`, `module/moduleResolution: NodeNext`, `rootDir: src`, `outDir: dist`, strict. `packages/server/tsconfig.json`: same but adds `"references": [{ "path": "../api-contract" }]`. Update root `tsconfig.json` to include `"references": [{ "path": "packages/api-contract" }, { "path": "packages/server" }]`.

- [ ] **Step 5: Minimal files so it compiles**

`packages/api-contract/src/index.ts`: `export {};`. `packages/server/src/index.ts`: `console.log('sproutly server boot');`.

- [ ] **Step 6: Install and verify**

Run: `npm install` at repo root.
Expected: packages resolve; no errors.
Run: `npm run server:dev` — should print the boot line. Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json packages/
git commit -m "feat(server): scaffold packages/api-contract and packages/server as npm workspaces"
```

---

## Task 2: Server env + service-role DB client

**Files:**
- Create: `packages/server/src/env.ts`, `packages/server/src/db/client.ts`, `packages/server/.env.example`

- [ ] **Step 1: Env parser**

In `env.ts`, read and validate required env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`). Optional: `PORT` (default 8787), `NODE_ENV` (default `development`). Use Zod to parse `process.env`. Export a single `env` object. Throw a descriptive error at import time if required vars are missing — but only when NOT under Vitest (detect via `process.env.VITEST`), so tests can import the module without real secrets.

- [ ] **Step 2: Service-role Supabase client**

In `db/client.ts`, create a `supabase-js` client using `env.SUPABASE_URL` and `env.SUPABASE_SERVICE_ROLE_KEY`. Export as a lazily-initialized singleton via a `getDb()` function (so tests can mock before first call).

- [ ] **Step 3: `.env.example`**

Commit `packages/server/.env.example` with placeholder values and comments. Add `server/.env` line to `.gitignore` is already present — verify by grep.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/env.ts packages/server/src/db/client.ts packages/server/.env.example
git commit -m "feat(server): env validation and service-role supabase client"
```

---

## Task 3: ApiError + error middleware + error contract

**Files:**
- Create: `packages/api-contract/src/errors.ts`
- Create: `packages/server/src/lib/api-error.ts`
- Create: `packages/server/src/middleware/errors.ts`
- Create: `packages/server/test/errors.test.ts`

- [ ] **Step 1 (TDD): Write failing test in `errors.test.ts`**

Boot a minimal Hono app with the error middleware. Add a test route that throws `new ApiError('NOT_FOUND', 'nope')`. Hit it and assert: status 404, body matches `ApiErrorBody` shape `{ error: { code, message, fields? } }`.

Add a second test: the route throws a `ZodError`; assert status 422 and `error.fields` is populated.

Add a third: an unknown `Error` → status 500, `code: 'INTERNAL'`, message does not leak stack.

- [ ] **Step 2: Run tests — expect FAIL**

`npm run test -w @sproutly/server` — tests fail (imports missing).

- [ ] **Step 3: Define error code union in api-contract**

In `packages/api-contract/src/errors.ts`: export `ErrorCode` union (`UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | VALIDATION | RATE_LIMITED | INTERNAL`), a map from code to HTTP status, and a Zod schema `ApiErrorBody` matching the envelope shape.

- [ ] **Step 4: `ApiError` class**

In `packages/server/src/lib/api-error.ts`: class with `code: ErrorCode`, `message`, optional `fields`. Exposes `.toResponse()` → `{ status, body }` using the code→status map.

- [ ] **Step 5: Error middleware**

In `middleware/errors.ts`: Hono error handler. Maps `ApiError` → its response; `ZodError` → `VALIDATION` with `fields` flattened from `issues`; anything else → `INTERNAL` with a generic message. Always sets `Content-Type: application/json`.

- [ ] **Step 6: Run tests — expect PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/api-contract/src/errors.ts packages/server/src/lib/api-error.ts packages/server/src/middleware/errors.ts packages/server/test/errors.test.ts
git commit -m "feat(server): ApiError class + error envelope middleware"
```

---

## Task 4: Auth middleware — verify JWT, load family context

**Files:**
- Create: `packages/server/src/middleware/auth.ts`
- Create: `packages/server/test/auth.test.ts`

- [ ] **Step 1 (TDD): Write failing tests**

Three cases, all mocking the supabase-js client used by `db/client.ts`:
- Missing `Authorization` header → 401 `UNAUTHENTICATED`.
- Malformed / invalid signature → 401 `UNAUTHENTICATED`.
- Valid token but no matching `families` row for `sub` → 403 `FORBIDDEN`.
- Valid token, `families` row found → handler runs; can read `c.get('ctx')` → `{ user_id, family_id, timezone }`.

Use a known HS256 test secret; sign tokens inline with `jsonwebtoken` for the valid cases.

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement**

`authMiddleware` reads `Authorization`, strips `Bearer `, `jwt.verify(token, env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] })`, reads `sub`, queries `families` via `getDb()`, attaches context via `c.set('ctx', {...})`. Each failure path throws `ApiError` so the error middleware handles it. Do NOT catch inside the middleware unless translating to a specific code.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/middleware/auth.ts packages/server/test/auth.test.ts
git commit -m "feat(server): JWT auth middleware with family_id context"
```

---

## Task 5: Hono app bootstrap + `/health`

**Files:**
- Modify: `packages/server/src/index.ts`
- Create: `packages/server/src/routes/health.ts`
- Create: `packages/server/test/health.test.ts`

- [ ] **Step 1 (TDD): Write failing test**

`GET /health` → 200, `{ ok: true, version: <string> }`. No auth required.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`routes/health.ts` exports a `healthRoute(app)` function that attaches the handler. `version` reads `process.env.GIT_SHA ?? 'dev'`. In `src/index.ts`, construct the Hono app, register the error middleware, mount `health`, and listen with `@hono/node-server` on `env.PORT`. Do NOT mount auth middleware globally — apply per-route group (next tasks).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Manual smoke**

Run `npm run server:dev`. `curl -s http://localhost:8787/health` → `{"ok":true,"version":"dev"}`.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/index.ts packages/server/src/routes/health.ts packages/server/test/health.test.ts
git commit -m "feat(server): boot hono app with /health"
```

---

## Task 6: `/me` schemas in api-contract

**Files:**
- Create: `packages/api-contract/src/schemas/common.ts`
- Create: `packages/api-contract/src/endpoints/me.ts`
- Modify: `packages/api-contract/src/index.ts`

- [ ] **Step 1: Common primitives**

In `schemas/common.ts`: `Uuid`, `LocalDate`, `Iso8601` Zod schemas (plus inferred types).

- [ ] **Step 2: `/me` endpoint schemas**

In `endpoints/me.ts`:
- `GetMeResponse` → `{ user_id, family_id, timezone, has_onboarded }`.
- `PatchMeRequest` → partial of `{ timezone }`. (Add display_name later if needed.)
- `PatchMeResponse` → same shape as `GetMeResponse`.
- `registerMe(registry)` stub for now — body added in Task 10. Still export the function so server can import it without breakage.

- [ ] **Step 3: Barrel**

`src/index.ts` re-exports everything from `endpoints/me`, `errors`, `schemas/common`.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contract/src/
git commit -m "feat(api-contract): /me request/response schemas"
```

---

## Task 7: `/me` routes (GET + PATCH)

**Files:**
- Create: `packages/server/src/routes/me.ts`
- Create: `packages/server/src/middleware/validate.ts`
- Create: `packages/server/test/me.test.ts`
- Modify: `packages/server/src/index.ts` — mount `/me`.

- [ ] **Step 1 (TDD): Write failing tests**

Auth-gated. Three tests:
- No token → 401.
- Valid token, `GET /me` → 200 with correct shape; `has_onboarded` is `true` if there's a `children` row, else `false`.
- Valid token, `PATCH /me` with `{ timezone: 'America/New_York' }` → 200, server updates `families.timezone`, response reflects the new value.
- Valid token, `PATCH /me` with `{ timezone: 'not-a-timezone' }` → 422 `VALIDATION`.

Mock the supabase-js client; assert queries are scoped by `family_id` from context, never the body.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Tiny validate helper**

`middleware/validate.ts`: `parseBody(schema, c)` reads JSON body, runs `schema.parse`, returns the parsed value. Throws `ZodError` on failure (error middleware converts). Same idea for `parseQuery`.

- [ ] **Step 4: `/me` handlers**

`routes/me.ts` exports `meRoute(app)`. Both handlers use `authMiddleware`. GET reads families + checks for a child. PATCH parses body, updates, returns the fresh record. Validate IANA timezone by trying `new Intl.DateTimeFormat(undefined, { timeZone: value })` in a safe helper; otherwise reject.

- [ ] **Step 5: Mount**

In `src/index.ts`, add `meRoute(app)` after `healthRoute(app)`.

- [ ] **Step 6: Run — expect PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/middleware/validate.ts packages/server/src/routes/me.ts packages/server/src/index.ts packages/server/test/me.test.ts
git commit -m "feat(server): GET/PATCH /me"
```

---

## Task 8: `/dev/impersonate` — dev-only token minting

**Files:**
- Create: `packages/api-contract/src/endpoints/dev.ts`
- Create: `packages/server/src/routes/dev.ts`
- Create: `packages/server/test/dev.test.ts`
- Modify: `packages/server/src/index.ts` — mount `/dev/impersonate`.
- Modify: `packages/api-contract/src/index.ts` — export.

- [ ] **Step 1 (TDD): Write failing tests**

- `NODE_ENV === 'production'` → 404 on any method. No token minted.
- Non-production, body `{ email }` for a user present in `families.parent_user_id` → 200 with `{ access_token, expires_at }`. The returned token verifies with `SUPABASE_JWT_SECRET` and has `sub` = that user's id, `role: 'authenticated'`, `exp` ~1h out.
- Non-production, `{ email }` for a user NOT present in `families.parent_user_id` → 403 `FORBIDDEN`.
- Non-production, malformed body → 422.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Schemas**

`endpoints/dev.ts`: `ImpersonateRequest = z.object({ email: z.string().email() })`, `ImpersonateResponse = z.object({ access_token: z.string(), expires_at: z.string().datetime() })`.

- [ ] **Step 4: Handler**

`routes/dev.ts`: If `env.NODE_ENV === 'production'`, do not register the route (or register a 404 handler — pick one and document; registering a 404 handler is safer because misconfiguration is visible as "always 404" rather than a 405 that hints at existence). Otherwise: look up the user via Supabase Admin (`supabase.auth.admin.listUsers` or equivalent, filter by email); if not found or not a parent in any `families` row → 403. Sign an HS256 JWT with `sub: user.id, role: 'authenticated'`, 1h expiry. Return token + ISO expires_at.

- [ ] **Step 5: Mount**

In `src/index.ts`, mount only when `env.NODE_ENV !== 'production'`.

- [ ] **Step 6: Run — expect PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/api-contract/src/endpoints/dev.ts packages/api-contract/src/index.ts packages/server/src/routes/dev.ts packages/server/src/index.ts packages/server/test/dev.test.ts
git commit -m "feat(server): POST /dev/impersonate (dev-only) for manual testing"
```

---

## Task 9: Grep-based family-scope lint test

**Files:**
- Create: `packages/server/test/grep-family-scope.test.ts`

- [ ] **Step 1: Write the test**

Read every `.ts` file under `packages/server/src/routes/`. For each file, find every occurrence of `.from(`. Confirm that within the same exported function, `.eq('family_id'` appears somewhere after (simple window check — e.g., within the next 40 lines). If a route legitimately needs to bypass (none should in Phase A), the file can include a `// @scope-ok-no-family` marker on the `.from(` line to opt out; the test ignores those.

- [ ] **Step 2: Run — expect PASS**

(The only route touching DB so far is `me.ts`, which scopes by `parent_user_id` and then `id` — treat `parent_user_id = ctx.user_id` as an acceptable scope marker too. Update the regex to accept either `family_id` or `parent_user_id`.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/test/grep-family-scope.test.ts
git commit -m "test(server): lint that routes scope by family_id or parent_user_id"
```

---

## Task 10: OpenAPI generation pipeline

**Files:**
- Create: `packages/api-contract/src/openapi.ts`, `packages/api-contract/scripts/generate.ts`
- Create: `packages/api-contract/openapi.yaml` (generated, committed)
- Modify: `packages/api-contract/src/endpoints/me.ts`, `dev.ts` — fill in `registerXxx(registry)`.
- Create: `packages/server/src/routes/openapi.ts`
- Modify: `packages/server/src/index.ts` — mount `/openapi.yaml` in dev.

- [ ] **Step 1: Wire `@asteasolutions/zod-to-openapi`**

In `api-contract/src/openapi.ts`, build an `OpenAPIRegistry`, import each endpoint module's `registerXxx` and call with the registry. Fill in the `registerMe` / `registerDev` stubs now: describe path, method, request schema, response schema, error codes. Generate a document with `OpenApiGeneratorV31`. Export `buildOpenApiDocument()`.

- [ ] **Step 2: CLI generator**

`scripts/generate.ts` calls `buildOpenApiDocument()`, serialises with `yaml.stringify`, writes to `packages/api-contract/openapi.yaml`. Log the endpoint count.

- [ ] **Step 3: Run the generator**

```bash
npm run generate:openapi
```

Expected: `openapi.yaml` appears and lists `GET /me`, `PATCH /me`, `POST /dev/impersonate`, `GET /health`, `GET /openapi.yaml`.

- [ ] **Step 4: Server route to serve the yaml in dev**

`routes/openapi.ts`: reads the file at `../api-contract/openapi.yaml` relative to package root, returns `text/yaml`. 404 in production.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contract/src/openapi.ts packages/api-contract/scripts/generate.ts packages/api-contract/src/endpoints/me.ts packages/api-contract/src/endpoints/dev.ts packages/api-contract/openapi.yaml packages/server/src/routes/openapi.ts packages/server/src/index.ts
git commit -m "feat(api-contract): generate openapi.yaml from zod + serve in dev"
```

---

## Task 11: CI check — generated OpenAPI matches committed

**Files:**
- Create: `packages/api-contract/test/openapi-in-sync.test.ts`

- [ ] **Step 1: Write the test**

Call `buildOpenApiDocument()`, stringify with the same yaml options the generator uses, and compare to `fs.readFile('../../openapi.yaml')`. Assert equality. If they drift, the test fails with a clear "run `npm run generate:openapi`" hint.

- [ ] **Step 2: Run — expect PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/api-contract/test/openapi-in-sync.test.ts
git commit -m "test(api-contract): fail CI if openapi.yaml drifts from zod schemas"
```

---

## Task 12: Typed app client `src/lib/api.ts`

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/api.test.ts`
- Modify: `.env.example` (app root) — add `EXPO_PUBLIC_API_URL`.

- [ ] **Step 1 (TDD): Write failing tests**

Mock `getParentClient().auth.getSession()` and `fetch` globally.
- `api.me.get()` includes `Authorization: Bearer <token>` header.
- 2xx JSON → parsed with response Zod schema; returns typed value.
- 401 once → wrapper calls `supabase.auth.refreshSession()` and retries; 200 on retry → succeeds.
- 401 twice → throws `ApiError('UNAUTHENTICATED')` and calls `supabase.auth.signOut()`.
- Non-2xx error envelope → throws `ApiError` with matching `code`, `message`, `fields`.
- 2xx body that doesn't match the response schema → throws `ApiError('INTERNAL', 'response shape mismatch')` (we own the message).

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`src/lib/api.ts` exports an `api` object keyed by resource. Internally, one `request(method, path, { body?, responseSchema })` helper does header injection, retry-on-401, and parsing. Throws typed `ApiError` (re-use the class from `api-contract` or define a client-side twin that shares the Zod error schema). Base URL from `process.env.EXPO_PUBLIC_API_URL`, with a startup warning if missing (reuse the pattern in `src/lib/supabase.ts`).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts .env.example
git commit -m "feat(app): typed REST client with 401 refresh-retry"
```

---

## Task 13: Swap the app's `/me` bootstrap probe

**Files:**
- Modify: `app/_layout.tsx` **or** `app/(first-launch)/parent-onboarding.tsx` (whichever runs the `families.select().limit(1)` bootstrap probe)
- Modify: affected callers of `userName.ts` if they also probe families

- [ ] **Step 1: Locate the current probe**

`grep -rn "families').select" app/ src/`. Identify the bootstrap probe (likely `app/_layout.tsx` line ~49 and `app/(first-launch)/parent-onboarding.tsx` line ~43). Decide which call is "does this user have onboarding yet" vs. "which family am I in."

- [ ] **Step 2: Replace with `api.me.get()`**

Update the caller to `const me = await api.me.get()`, then branch on `me.has_onboarded`. Drop the direct supabase call. No behavior change — just different transport.

- [ ] **Step 3: Run the app manually**

Start `npm run server:dev` and `npm start`. Sign in, complete onboarding, confirm the app still routes correctly. Foreground the app and confirm no regression.

- [ ] **Step 4: Commit**

```bash
git add app/ src/
git commit -m "feat(app): route onboarding bootstrap probe through GET /me"
```

---

## Task 14: Insomnia import smoke test

**Files:** none — manual only.

- [ ] **Step 1: Import**

Open Insomnia → Import → File → select `packages/api-contract/openapi.yaml`. Confirm a workspace is created with requests for `GET /health`, `GET /me`, `PATCH /me`, `POST /dev/impersonate`, `GET /openapi.yaml`.

- [ ] **Step 2: Environment setup**

Create `local` environment: `base_url = http://localhost:8787`. Leave `bearer_token` empty.

- [ ] **Step 3: End-to-end**

With `npm run server:dev` running and a known parent email in the DB, call `POST /dev/impersonate` with `{ email }`. Copy `access_token` into `bearer_token`. Call `GET /me` — expect 200 with your family id. Call `PATCH /me` with `{ "timezone": "America/New_York" }` — expect 200 with the updated timezone.

- [ ] **Step 4: No commit.**

This is a verification step. Document any ergonomic gaps discovered as TODOs for a later plan.

---

## Task 15: Wiki updates

**Files:**
- Create: `wiki/entities/servers/rest-server.md`
- Create: `wiki/concepts/api-contract.md`
- Modify: `wiki/synthesis/architecture.md` — add REST server block.
- Modify: `wiki/index.md` — add new pages.
- Append: `wiki/log.md`.

- [ ] **Step 1: Write `rest-server.md`**

Short page: what it runs, listen address, endpoints live today (`/health`, `/me`, `/dev/impersonate`, `/openapi.yaml` in dev), env vars, how auth works. Link to the spec and this plan.

- [ ] **Step 2: Write `api-contract.md`**

Short page: `packages/api-contract` owns Zod schemas, `generate:openapi` writes `openapi.yaml`, CI keeps them in sync, client wrapper parses responses with the same schemas.

- [ ] **Step 3: Update `architecture.md`**

Add a paragraph noting the REST server exists (Phase A), lives in `packages/server`, and the app uses Supabase SDK for auth + realtime and REST for everything else. Phrase so it's true even with only `/me` migrated.

- [ ] **Step 4: Update `index.md`**

Add the two new pages under appropriate clusters.

- [ ] **Step 5: Log entry**

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] add | rest api phase A: packages/server + packages/api-contract, /me, /dev/impersonate, openapi pipeline
- touched: packages/, src/lib/api.ts, app/_layout.tsx, wiki/
- reason: centralize rules; scaffolding only, per-resource migrations follow
```

- [ ] **Step 6: Commit**

```bash
git add wiki/
git commit -m "docs(wiki): REST server phase A — new pages and architecture update"
```

---

## Task 16: Green-check sweep

- [ ] **Step 1: Lint / tests**

`npm run test` at root runs Vitest across workspaces (verify config). Expected: all tests pass.

- [ ] **Step 2: OpenAPI sync**

`npm run generate:openapi` — no diff in `openapi.yaml` (if there is, commit it and re-run the CI test).

- [ ] **Step 3: Manual smoke**

Fresh terminal: `npm run server:dev`. `curl -s localhost:8787/health`. Confirm `/dev/impersonate` is reachable in dev and 404s with `NODE_ENV=production npm run server`.

- [ ] **Step 4: App smoke**

`npm start`, sign in, confirm onboarding flow works end-to-end via `api.me.get()`.

- [ ] **Step 5: No commit.**

---

## Acceptance for Phase A

- `npm run test` green across `packages/api-contract`, `packages/server`, and the app.
- `packages/api-contract/openapi.yaml` lists every implemented endpoint; CI check green.
- Insomnia import produces a working workspace.
- App's onboarding bootstrap probe routes through `GET /me`; no regression.
- `/dev/impersonate` returns 404 in `NODE_ENV=production`.
- Wiki pages exist and the log line is in place.

---

## Risks noted for downstream plans

- **Phase B migration order.** Start with `/children` and `/tasks` (low rule density, high coverage) before `/task-completions` and `/day-roll` (rule-heavy). Phase B's first plan should pin the order.
- **Realtime interplay with server writes.** Verify in the Phase B `/task-completions` plan that Supabase Realtime broadcasts when the server inserts via service role — documented in the spec but worth a live smoke test when that endpoint lands.
- **Deploy pipeline.** Still out of scope. Before Phase B ships user-visible endpoints in production, the server needs a hosting story. Flag when Phase B planning starts.
