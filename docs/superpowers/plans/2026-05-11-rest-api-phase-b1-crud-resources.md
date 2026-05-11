# REST API — Phase B1: CRUD Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the CRUD-shaped resources off direct Supabase calls and onto the REST server: `/children`, `/tasks`, `/cosmetics`, `/daily-summaries`, and the simple `/insights` endpoints (`GET`, `/apply`, `/dismiss`). After this plan, only `/task-completions` and `/day-roll` remain on the Supabase SDK in the app — those are Phase B2.

**Architecture:** One resource per task. Each task adds Zod schemas in `packages/api-contract`, adds the route(s) in `packages/server`, swaps every affected app call site to `api.<resource>.x()`, and deletes the direct `supabase.from(...)` lines in the same diff. Regenerate `openapi.yaml` per task. Ship each resource as a standalone PR.

**Tech Stack:** TypeScript, Hono, Zod, `@asteasolutions/zod-to-openapi`, `@supabase/supabase-js`, Vitest. Same stack as Phase A.

**Spec:** [`docs/superpowers/specs/2026-05-11-rest-api-design.md`](../specs/2026-05-11-rest-api-design.md)

**Depends on:** [`docs/superpowers/plans/2026-05-11-rest-api-phase-a-scaffolding.md`](./2026-05-11-rest-api-phase-a-scaffolding.md) (must be shipped — workspaces, `api-contract`, `server`, auth middleware, `src/lib/api.ts`, OpenAPI pipeline are all in place).

**Preconditions:**
- Flexible-device-roles must have shipped. In particular, `app/(parent)/settings.tsx` currently references `kid_devices`; that code must be gone before this plan starts. Stop and flag to the user if `grep -rn "kid_devices" app/ src/` returns hits.
- **As of 2026-05-11:** `kid_devices` is still used in `settings.tsx` (pairing / device list). B1 shipped anyway; remove this note when flexible-device-roles removes those calls.

**Explicitly out of scope for this plan:**
- `POST /task-completions`, `DELETE /task-completions/:id`, `POST /day-roll`. Phase B2.
- `POST /insights/generate`. Phase C (absorbs the edge function).
- `DELETE /me`. Deferred.
- Realtime transport changes. App still subscribes via Supabase SDK.

---

## File Structure

**New files (per-resource, one set per Task)**

For each resource `<R>` in {`children`, `tasks`, `cosmetics`, `daily-summaries`, `insights`}:

- `packages/api-contract/src/endpoints/<R>.ts` — request/response Zod schemas + `register<R>(registry)`.
- `packages/server/src/routes/<R>.ts` — Hono route handlers.
- `packages/server/test/<R>.test.ts` — route tests (auth, happy path, validation, cross-family forbidden).

**Modified files (per-resource)**

- `packages/api-contract/src/index.ts` — export the new endpoint module.
- `packages/api-contract/src/openapi.ts` — register the resource.
- `packages/api-contract/openapi.yaml` — regenerated.
- `packages/server/src/index.ts` — mount the new route.
- `src/lib/api.ts` — add `api.<R>.*` methods.
- `src/lib/api.test.ts` — add tests if new request shapes introduce new wrapper behavior (most don't; reuse existing coverage).

**App call sites swapped (grouped by resource)**

- `/children`:
  - `app/(first-launch)/parent-onboarding.tsx` (insert on onboarding, delete on failure rollback)
  - `app/(parent)/settings.tsx` (select)
  - `app/(parent)/today.tsx` (select)
  - `app/(parent)/edit-profile.tsx` (select + update)
  - `app/(parent)/task-edit.tsx` (select for child_id)
  - `src/hooks/useKidScreenState.ts` (select)
- `/tasks`:
  - `app/(parent)/today.tsx` (list)
  - `app/(parent)/tasks.tsx` (list)
  - `app/(parent)/task-edit.tsx` (get/insert/update/soft-delete)
  - `src/hooks/useKidScreenState.ts` (list for child)
- `/cosmetics`:
  - No current call site; endpoint still shipped so tasks/tomorrow can depend on it. Add a usage in `task-edit.tsx` if bonus-cosmetic selection needs it, else hold as "catalog in place for future."
- `/daily-summaries`:
  - No direct reads in app today. Endpoint shipped for use by Phase B2 (`/day-roll`) and future insights UI. Ship GET only; leave unmount-dead until consumers land.
- `/insights`:
  - `app/(parent)/today.tsx` (list active, apply, dismiss).
- `families` reads that duplicate `/me`:
  - `app/(parent)/today.tsx`, `app/(parent)/edit-profile.tsx`, `app/(parent)/settings.tsx`, `src/hooks/useKidScreenState.ts` all call `families.select(...)`. Replace with `api.me.get()` from Phase A. Covered in Task 7 (cleanup sweep).

**Wiki touches**
- Update `wiki/entities/servers/rest-server.md` to list the new endpoints.
- Update `wiki/synthesis/architecture.md` — "REST server hosts all CRUD" once this plan lands.
- Append a `wiki/log.md` entry per task (one per resource, keeps log terse).

---

## Task 1: `/children` endpoints + migration

**Files:**
- Create: `packages/api-contract/src/endpoints/children.ts`
- Create: `packages/server/src/routes/children.ts`
- Create: `packages/server/test/children.test.ts`
- Modify: `packages/api-contract/src/index.ts`, `src/openapi.ts`, `openapi.yaml` (regen)
- Modify: `packages/server/src/index.ts`
- Modify: `src/lib/api.ts`
- Modify: `app/(first-launch)/parent-onboarding.tsx`, `app/(parent)/settings.tsx`, `app/(parent)/today.tsx`, `app/(parent)/edit-profile.tsx`, `app/(parent)/task-edit.tsx`, `src/hooks/useKidScreenState.ts`

### Endpoints

- `GET /children` → returns the family's child roster (array; V1 expects 0 or 1).
- `POST /children` → create. Body: `name`, `age?`, `avatar_stage?`, `cosmetics?`, `equipped_cosmetics?`. Server enforces `family_id` from context; rejects if a child already exists (V1 single-child; return `409 CONFLICT`).
- `PATCH /children/:id` → partial update. Server confirms the child belongs to caller's family (else `403 FORBIDDEN`). Avatar stage transitions validated — only allow advancing by one or staying; reject arbitrary writes with `422 VALIDATION`.

### Schemas (shape, not code)

- `Child` — matches the table: `id, family_id, name, age, avatar_stage, successful_days, last_evaluated_date, pending_stage_transition, cosmetics, equipped_cosmetics, created_at`.
- `CreateChildRequest` — `name`, optional `age` (3–12), optional `avatar_stage` (1 default), optional cosmetics jsonb shapes.
- `UpdateChildRequest` — partial of: `name, age, avatar_stage, cosmetics, equipped_cosmetics`. `successful_days`, `last_evaluated_date`, `pending_stage_transition` not editable via this endpoint (reserved for `/day-roll`).

- [x] **Step 1: Schemas in api-contract**

Add `Child` (matches DB columns), `CreateChildRequest`, `UpdateChildRequest`, `ChildrenListResponse = z.array(Child)`. Export from `packages/api-contract/src/index.ts`. Add `registerChildren(registry)` in `packages/api-contract/src/endpoints/children.ts` that describes all three endpoints with example bodies, following the pattern used by `registerMe` / `registerDev`.

Wire it into the central registry: in `packages/api-contract/src/openapi.ts`, import `registerChildren` and call it alongside the existing `registerMe(registry)` / `registerDev(registry)` calls.

- [x] **Step 2 (TDD): Failing route tests**

In `children.test.ts`, cover:
- `GET /children` no token → 401; with valid token and no child → `[]`; with one child → array of one.
- `POST /children` valid body → 201 + returned row; duplicate create → 409; body missing `name` → 422; body trying to set `successful_days` → 422.
- `PATCH /children/:id` wrong family_id child → 403; `avatar_stage: 5` when current is 1 → 422; `avatar_stage: 2` when current is 1 → 200.

Mock supabase-js; assert every query scopes through `family_id`.

- [x] **Step 3: Run — expect FAIL**

- [x] **Step 4: Route implementation**

`routes/children.ts`: three handlers. All use `authMiddleware`. GET reads from `children` filtered by `family_id`. POST inserts with `family_id` from context; pre-check row existence for the 409. PATCH reads the child, verifies `family_id` match, validates avatar stage rule via a small helper in `server/src/domain/avatar-stage.ts`, then updates.

Mount in `server/src/index.ts`.

- [x] **Step 5: Run — expect PASS**

- [x] **Step 6: Regenerate and stage OpenAPI**

Run from repo root: `npm run generate:openapi`.

Expected: `packages/api-contract/openapi.yaml` diff shows the three new paths (`/children`, `/children/{id}`) with their schemas and response envelopes. No unrelated churn.

Verify with: `git diff --stat packages/api-contract/openapi.yaml` — only the expected additions.

Verify CI sync test still passes: `npm run test -w @sproutly/api-contract` — the `openapi-in-sync.test.ts` (from Phase A, Task 11) must pass.

The regenerated `openapi.yaml` gets staged and committed together with the rest of the task in Step 10.

- [x] **Step 7: App client wrapper**

In `src/lib/api.ts`, add `api.children = { list, create, update }`. Each is a ~5-line call to the shared `request(...)` helper with the matching response schema.

- [x] **Step 8: Swap app call sites**

For each file listed in File Structure, replace the `supabase.from('children')...` lines with the corresponding `api.children.*` call. Preserve existing UI behavior — no logic change, just transport.

Tricky one: `parent-onboarding.tsx` does an insert-then-rollback-on-failure. Replace with a single `api.children.create(...)`; the server is atomic, so the rollback branch becomes an error toast instead.

`src/hooks/useKidScreenState.ts` currently does a parallel 4-way read. Replace only the `children` line; the rest waits for other tasks in this plan.

- [x] **Step 9: Manual smoke**

Run server + app. Fresh install → onboarding writes via REST → Today screen loads child. Edit-profile updates name and age. Observe the child data round-trips correctly.

- [x] **Step 10: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/ app/
git status --short packages/api-contract/openapi.yaml  # confirm it's staged
git commit -m "feat(api): /children endpoints; migrate app call sites"
```

---

## Task 2: `/tasks` endpoints + migration

**Files:**
- Create: `packages/api-contract/src/endpoints/tasks.ts`
- Create: `packages/server/src/routes/tasks.ts`
- Create: `packages/server/test/tasks.test.ts`
- Modify: api-contract index/openapi, server index, `src/lib/api.ts`
- Modify: `app/(parent)/today.tsx`, `app/(parent)/tasks.tsx`, `app/(parent)/task-edit.tsx`, `src/hooks/useKidScreenState.ts`

### Endpoints

- `GET /tasks?is_active=true` → list (default active-only; pass `is_active=false` or `all` to override).
- `POST /tasks` → create. Body validated against recurrence shape (`recurrence ∈ {daily, weekdays, custom, one_time}`; `recurrence_days` required only when `recurrence='custom'`; empty array rejected).
- `PATCH /tasks/:id` → partial. Verifies the task's child belongs to caller's family.
- `DELETE /tasks/:id` → soft delete (`is_active = false`). Hard delete not exposed.

### Schemas

- `Task` — matches table: `id, child_id, title, icon, category, time_slot, difficulty, recurrence, recurrence_days, is_bonus, bonus_cosmetic_id, is_active, created_at`.
- `CreateTaskRequest` — required `child_id, title, category, time_slot, recurrence`; optional `icon, difficulty, recurrence_days, is_bonus, bonus_cosmetic_id`. Server confirms `child_id` belongs to caller's family.
- `UpdateTaskRequest` — partial of CreateTaskRequest (no `child_id` change).

- [x] **Step 1: Schemas**

Export from api-contract with the shapes above. Include a Zod refine on `CreateTaskRequest` / `UpdateTaskRequest` enforcing the custom-recurrence rule. Add `registerTasks(registry)` describing all four endpoints.

Wire into the central registry: `packages/api-contract/src/openapi.ts` imports and calls `registerTasks(registry)`.

- [x] **Step 2 (TDD): Failing tests**

- `GET /tasks`: no token → 401; valid token → returns only active tasks by default.
- `POST /tasks` valid → 201; invalid recurrence shape → 422; `child_id` for another family → 403.
- `PATCH /tasks/:id` valid → 200; wrong family → 403.
- `DELETE /tasks/:id` → 200 + row shows `is_active=false`; second delete → idempotent 200 (still inactive).

Mock supabase-js; assert queries join through `children` to check `family_id` on writes (either a pre-flight select-and-check or a single update with a join — pick one and comment why in the handler).

- [x] **Step 3: Run — expect FAIL**

- [x] **Step 4: Implement**

`routes/tasks.ts`: four handlers. For any mutating endpoint, do a pre-check select that joins through `children` to verify family ownership (cheaper than subquery for our scale). Mount.

- [x] **Step 5: Run — expect PASS**

- [x] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected diff: four new paths (`GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`) + `Task`, `CreateTaskRequest`, `UpdateTaskRequest` schemas. Run `npm run test -w @sproutly/api-contract` to confirm the drift test passes.

- [x] **Step 7: App wrapper**

`api.tasks = { list, create, update, softDelete }`.

- [x] **Step 8: Swap call sites**

Replace `sb.from('tasks')...` in the four files. `today.tsx` and `tasks.tsx` become `api.tasks.list({ is_active: true })`. `task-edit.tsx` uses `api.tasks.create / update / softDelete`. `useKidScreenState.ts` uses `api.tasks.list({ is_active: true, is_bonus: false, child_id })` (add the filter to the list query schema).

- [x] **Step 9: Manual smoke**

Create a task, edit it, soft-delete it. Confirm parent Today + Tasks tab reflect correctly.

- [x] **Step 10: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/ app/
git commit -m "feat(api): /tasks endpoints; migrate app call sites"
```

---

## Task 3: `/cosmetics` endpoints

**Files:**
- Create: api-contract + server + test files for `cosmetics`.
- Modify: index/openapi/server index, `src/lib/api.ts`.

### Endpoints

- `GET /cosmetics` → public-ish catalog (still auth-gated per spec). No write endpoints — it's a static catalog managed by migrations.

### Schemas

- `Cosmetic` — `id, name, type ∈ {horn, mane, background}, asset_path`.
- `CosmeticsListResponse = z.array(Cosmetic)`.

- [x] **Step 1: Schemas**

Add schemas + `registerCosmetics(registry)` in `packages/api-contract/src/endpoints/cosmetics.ts`. Wire into `packages/api-contract/src/openapi.ts`.

- [x] **Step 2 (TDD): Failing tests**

- No token → 401.
- Valid token → returns all rows from `cosmetics`. Rows are identical across families (no `family_id`), but the endpoint still requires auth — confirm the middleware runs.

- [x] **Step 3: Run — expect FAIL**

- [x] **Step 4: Implement** — one-liner select.

- [x] **Step 5: Run — expect PASS**

- [x] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected diff: one new path (`GET /cosmetics`) + `Cosmetic` schema. Drift test (`npm run test -w @sproutly/api-contract`) passes.

- [x] **Step 7: App wrapper** — `api.cosmetics.list()`.

- [x] **Step 8: Swap call sites** — none exist today. Skip.

- [x] **Step 9: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/
git commit -m "feat(api): GET /cosmetics"
```

---

## Task 4: `/daily-summaries` endpoint

**Files:** api-contract + server + test, server index, `src/lib/api.ts`.

### Endpoints

- `GET /daily-summaries?from=YYYY-MM-DD&to=YYYY-MM-DD&child_id=<uuid>` → list in ascending `local_date` order. Default range: last 30 days; cap at 90 days per request.

### Schemas

- `DailySummary` — `child_id, local_date, total_tasks, completed_tasks, was_successful, simplified_from_miss`.
- `DailySummariesListRequest` (query) — `from?`, `to?`, `child_id` (required — even though V1 has one child, keep the API explicit).
- `DailySummariesListResponse = z.array(DailySummary)`.

- [x] **Step 1: Schemas**

Add schemas + `registerDailySummaries(registry)` in `packages/api-contract/src/endpoints/daily-summaries.ts`. Wire into `packages/api-contract/src/openapi.ts`.

- [x] **Step 2 (TDD): Failing tests**

- No token → 401.
- Valid token, `child_id` in another family → 403.
- Default range → last 30 days returned.
- Range > 90 days → 422.
- Range inverted (`from > to`) → 422.

- [x] **Step 3: Run — expect FAIL**

- [x] **Step 4: Implement**

Route validates `child_id` ownership via `children` join. Query parses `from`/`to` as `LocalDate`; defaults computed server-side using the family timezone from auth context.

- [x] **Step 5: Run — expect PASS**

- [x] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected diff: one new path (`GET /daily-summaries`) + `DailySummary` schema. Drift test passes.

- [x] **Step 7: App wrapper** — `api.dailySummaries.list(...)`.

- [x] **Step 8: Swap call sites** — none exist today. The endpoint is scaffolded for Phase B2 (`/day-roll`) and later insight UI.

- [x] **Step 9: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/
git commit -m "feat(api): GET /daily-summaries"
```

---

## Task 5: `/insights` endpoints (list / apply / dismiss)

**Files:** api-contract + server + test, server index, `src/lib/api.ts`, `app/(parent)/today.tsx`.

### Endpoints

- `GET /insights?state=active` — `active` (not applied and not dismissed, default), `applied`, `dismissed`, `all`. Ordered `generated_at desc`.
- `POST /insights/:id/apply` — idempotent; sets `is_applied=true`. If already applied → still 200 with current row.
- `POST /insights/:id/dismiss` — idempotent; sets `is_dismissed=true`. If already dismissed → 200.

Not included here: `POST /insights/generate` — Phase C.

### Schemas

- `Insight` — matches table.
- `InsightsListResponse = z.array(Insight)`.
- `InsightActionResponse = Insight` (return the updated row).

- [x] **Step 1: Schemas**

Add schemas + `registerInsights(registry)` in `packages/api-contract/src/endpoints/insights.ts`. Wire into `packages/api-contract/src/openapi.ts`.

- [x] **Step 2 (TDD): Failing tests**

- List default `state=active` excludes applied/dismissed.
- Apply/dismiss idempotent.
- Cross-family insight id → 403.

- [x] **Step 3: Run — expect FAIL**

- [x] **Step 4: Implement**

List: filter by family and state. Apply/Dismiss: update where `id = :id AND family_id = :ctx.family_id`; if no row affected → 404.

- [x] **Step 5: Run — expect PASS**

- [x] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected diff: three new paths (`GET /insights`, `POST /insights/{id}/apply`, `POST /insights/{id}/dismiss`) + `Insight` schema. Drift test passes.

- [x] **Step 7: App wrapper** — `api.insights = { list, apply, dismiss }`.

- [x] **Step 8: Swap call sites in `today.tsx`**

Replace the three `ai_insights` calls with `api.insights.list / apply / dismiss`.

- [x] **Step 9: Manual smoke**

Seed an insight row in the DB (or let the edge function create one). Confirm it appears on the Today screen, applies and dismisses correctly.

- [x] **Step 10: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/ app/
git commit -m "feat(api): /insights list/apply/dismiss; migrate today screen"
```

---

## Task 6: Cleanup sweep — families reads through `/me`

**Files:** `app/(parent)/today.tsx`, `app/(parent)/settings.tsx`, `app/(parent)/edit-profile.tsx`, `src/hooks/useKidScreenState.ts`.

- [x] **Step 1: Locate**

Run `grep -rn "from('families')" app/ src/ | grep -v node_modules`. Every hit should either (a) be doing what `/me` already returns, or (b) be an update. Updates of `families.timezone` should go through `api.me.patch({ timezone })` — already shipped in Phase A.

- [x] **Step 2: Swap**

Replace with `api.me.get()` / `api.me.patch()`. `edit-profile.tsx` currently writes timezone alongside child update — split into two calls.

- [x] **Step 3: Manual smoke**

Sign out, sign back in, onboarding, profile edits still work. Settings screen still shows timezone.

- [x] **Step 4: Commit**

```bash
git add app/ src/
git commit -m "refactor(app): families reads route through /me"
```

---

## Task 7: Green-check sweep + wiki updates

**Files:** `wiki/entities/servers/rest-server.md`, `wiki/synthesis/architecture.md`, `wiki/log.md`.

- [x] **Step 1: Grep check**

Run `grep -rn "supabase.from\|\.from('\|\.rpc('" app/ src/ | grep -v node_modules | grep -v "\.test\."`. Remaining hits must be:
- `task_completions` reads/writes → Phase B2.
- Realtime `supabase.channel(...)` in kid screen state → intentional, stays.
- Auth calls (`supabase.auth.*`) → intentional, stay.
- Anything else → investigate before shipping.

- [x] **Step 2: Run tests**

`npm run test` at root. All green.

Also explicitly run the OpenAPI drift check: `npm run generate:openapi && git diff --exit-code packages/api-contract/openapi.yaml`. Expected: exit 0 (no uncommitted drift).

- [x] **Step 3: Manual smoke**

End-to-end: fresh onboarding → Today screen → add / edit / complete (via direct SDK — still allowed in B1) / dismiss insight → edit profile → relaunch. No regression.

- [x] **Step 4: Wiki**

Update `wiki/entities/servers/rest-server.md` to list the new endpoints shipped in B1. Update `wiki/synthesis/architecture.md` if the text still implies CRUD runs on Supabase SDK — now it doesn't for these resources.

- [x] **Step 5: Log entry**

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] add | rest api phase B1: /children, /tasks, /cosmetics, /daily-summaries, /insights
- touched: packages/, src/lib/api.ts, app/, src/hooks/
- reason: centralize CRUD behind REST; only /task-completions and /day-roll left (B2)
```

- [x] **Step 6: Commit**

```bash
git add wiki/
git commit -m "docs(wiki): REST phase B1 — CRUD resources migrated"
```

---

## Acceptance for Phase B1

- `GET/POST /children`, `PATCH /children/:id` live and tested.
- `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id` live and tested.
- `GET /cosmetics`, `GET /daily-summaries`, `GET /insights`, `POST /insights/:id/apply`, `POST /insights/:id/dismiss` live and tested.
- App has no direct `supabase.from(...)` calls for these resources. Only `task_completions` and auth/realtime remain on the SDK.
- `openapi.yaml` includes all new endpoints; CI drift check green.
- Manual end-to-end on parent flows passes.
- Wiki + log updated.

---

## Risks noted for Phase B2

- **Realtime broadcast under service-role writes.** Confirm with a live smoke test when `/task-completions` lands that the kid-mode subscription fires as expected. The spec asserts this but it's unverified in production.
- **Idempotency key discipline.** `POST /task-completions` uses `(task_id, local_date)` (the DB unique already exists). B2 plan must resolve "which date" on the server, never from the client clock.
- **Day-roll concurrency.** If two devices foreground at once, both call `POST /day-roll`. Server must be idempotent under concurrent callers — rely on the `(child_id, local_date)` primary key on `daily_summaries` plus an advisory lock or upsert pattern.
