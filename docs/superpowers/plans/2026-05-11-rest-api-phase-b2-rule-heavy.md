# REST API — Phase B2: Rule-Heavy Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the two rule-heavy flows off direct Supabase calls and onto the REST server: `POST /task-completions` (idempotent completion writes, server-stamped local_date) and `POST /day-roll` (authoritative daily bookkeeping + stage bumps + miss→simplify draft insight). After this plan, the parent app has **zero** direct `supabase.from(...)` calls; only `auth` and `realtime` subscriptions remain on the Supabase SDK. The kid `useKidScreenState` hook remains deferred until flexible-device-roles finishes.

**Architecture:** Two new endpoints. Day-roll logic moves from the device into `packages/server/src/domain/day-roll.ts` (pure) and a `packages/server/src/services/day-roll.ts` orchestrator (pure + DB). Server is the authority on "today" for both endpoints — computed from the family's IANA timezone via `packages/server/src/lib/local-date.ts`. Idempotency is enforced at the DB layer (the existing `task_completions(task_id, local_date)` unique and the `daily_summaries(child_id, local_date)` primary key) plus application-level idempotent-response semantics.

**Tech Stack:** TypeScript, Hono, Zod, `@asteasolutions/zod-to-openapi`, `@supabase/supabase-js`, Vitest. Same stack as Phase A/B1.

**Spec:** [`docs/superpowers/specs/2026-05-11-rest-api-design.md`](../specs/2026-05-11-rest-api-design.md)

**Depends on:**
- [`2026-05-11-rest-api-phase-a-scaffolding.md`](./2026-05-11-rest-api-phase-a-scaffolding.md) — shipped.
- [`2026-05-11-rest-api-phase-b1-crud-resources.md`](./2026-05-11-rest-api-phase-b1-crud-resources.md) — shipped (including the follow-up `POST /families` and onboarding migration).

**Preconditions & carve-outs:**
- `src/hooks/useKidScreenState.ts` still reads via the Supabase SDK (children, families, tasks, task_completions). **Not migrated in this plan.** Its migration is blocked on flexible-device-roles finishing. The Phase B2 grep-check in Task 6 tolerates those exact four reads.
- Realtime subscription to `task_completions` INSERT events stays on the Supabase SDK. Confirm in manual smoke (Task 5) that service-role inserts still broadcast.

**Explicitly out of scope for this plan:**
- `POST /insights/generate` (Claude-powered). Phase C. The **draft** insight written by day-roll on a miss (suggestion_type = `simplify_tomorrow`) is a DB row, not a Claude call — that part is in scope.
- `DELETE /task-completions/:id` ("unmark"). Not currently used by any UI; if B2 reveals a need, add as a small Task 4b; otherwise deferred.
- Kid hook migration (see preconditions).
- Production deploy pipeline.

---

## File Structure

**New files**
- `packages/api-contract/src/endpoints/task-completions.ts` — request/response schemas + `registerTaskCompletions(registry)`.
- `packages/api-contract/src/endpoints/day-roll.ts` — request/response schemas + `registerDayRoll(registry)`.
- `packages/server/src/routes/task-completions.ts` — `POST /task-completions`.
- `packages/server/src/routes/day-roll.ts` — `POST /day-roll`.
- `packages/server/src/domain/day-roll.ts` — pure: success threshold, stage-threshold lookup, list of missing dates between `last_evaluated_date` and `yesterday`, miss-simplify candidate picker (worst time slot).
- `packages/server/src/services/day-roll.ts` — orchestrator: loads data, calls pure helpers, writes rows via service role. One exported `runDayRollForChild(db, child, family, now)`.
- `packages/server/src/services/task-completions.ts` — orchestrator for the POST: validates child belongs to family, stamps `local_date`, inserts with idempotent-on-conflict handling.
- `packages/server/test/task-completions.test.ts` — route + idempotency tests.
- `packages/server/test/day-roll.test.ts` — route test (happy path + idempotent no-op + multi-day catch-up + stage bump).
- `packages/server/test/domain-day-roll.test.ts` — pure-function tests for `packages/server/src/domain/day-roll.ts`.

**Modified files**
- `packages/api-contract/src/index.ts` — export the two new endpoint modules.
- `packages/api-contract/src/openapi.ts` — import + call `registerTaskCompletions(registry)` and `registerDayRoll(registry)` alongside the existing registrations.
- `packages/api-contract/openapi.yaml` — regenerated (three new paths total; `POST /day-roll` + `POST /task-completions`; total path count after this plan: 16).
- `packages/server/src/app.ts` — mount the two new routes.
- `src/lib/api.ts` — add `api.taskCompletions.create(...)` and `api.dayRoll.run(...)`.
- `app/(parent)/today.tsx` — replace the two remaining `task_completions` call sites:
  - list-by-date read → `api.taskCompletions.list({ local_date })` (new sub-endpoint, see below) OR keep a single-call strategy where `POST /day-roll` returns the current day's completions list; pick the first, it keeps today.tsx's read/write paths symmetric.
  - insert on tap → `api.taskCompletions.create({ task_id, child_id })`.
- `app/_layout.tsx` (or wherever foregrounding is handled) — trigger `api.dayRoll.run()` on app foreground / first render of `/today`. Exact insertion point confirmed during Task 3.

**Wiki touches (per CLAUDE.md — same change as code)**
- Update `wiki/concepts/day-roll.md`: remove the "parent app: yes, kid iPad: no" paragraph; replace with "runs on the REST server; triggered by parent app foreground via `POST /day-roll`." Keep the invariants section intact.
- Update `wiki/entities/servers/rest-server.md`: add the new endpoints to the table.
- Append a `wiki/log.md` entry per task (one line each).

---

## Task 1: `/task-completions` schemas + route + idempotency

**Files:**
- Create: `packages/api-contract/src/endpoints/task-completions.ts`
- Create: `packages/server/src/routes/task-completions.ts`
- Create: `packages/server/src/services/task-completions.ts`
- Create: `packages/server/test/task-completions.test.ts`
- Modify: `packages/api-contract/src/index.ts`, `src/openapi.ts`, server `app.ts`

### Endpoints

- `POST /task-completions` — mark a task complete for a given child.
  - Body: `{ task_id, child_id, local_date? }`. `local_date` optional; server fills from `family.timezone` via `todayYmdInTz`. If client supplies `local_date`, server validates it's within ±1 day of server-computed today (reject `422 VALIDATION` otherwise).
  - Server verifies the task's `child_id` belongs to caller's family (join through `children`). `403` if not.
  - Insert via service role. On `(task_id, local_date)` unique conflict, re-select the existing row and return it with `idempotent: true`. On fresh insert return `idempotent: false`. Always `200`.
  - Returns: `{ completion: TaskCompletion, idempotent: boolean }`.
- `GET /task-completions?child_id=<uuid>&local_date=YYYY-MM-DD` — list completions for one child on one local date.
  - `child_id` required. `local_date` optional (default = today in family TZ).
  - Scope enforced same way (child→family join).

### Schemas

- `TaskCompletion` — matches table: `id, task_id, child_id, local_date, completed_at, marked_by_parent`.
- `CreateTaskCompletionRequest` — `task_id: Uuid`, `child_id: Uuid`, `local_date?: LocalDate`.
- `CreateTaskCompletionResponse` — `{ completion: TaskCompletion, idempotent: boolean }`.
- `TaskCompletionsListRequest` (query) — `child_id: Uuid`, `local_date?: LocalDate`.
- `TaskCompletionsListResponse = z.array(TaskCompletion)`.

- [ ] **Step 1: Schemas in api-contract**

Add the five exports above in `packages/api-contract/src/endpoints/task-completions.ts`. Export from `src/index.ts`. Implement `registerTaskCompletions(registry)` describing both paths with request/response schemas and the `403` / `422` error cases. Wire into `packages/api-contract/src/openapi.ts` next to the other `register*` calls.

- [ ] **Step 2 (TDD): Failing route tests**

In `task-completions.test.ts`, cover:
- No token → 401.
- `POST` with a `child_id` in another family → 403.
- `POST` minimal body, no `local_date` → 200 with `idempotent: false`; server fills `local_date` from family timezone.
- `POST` with `local_date` two days in the future → 422.
- `POST` same body twice → first 200 `idempotent: false`, second 200 `idempotent: true`; both return the same `completion.id`.
- `GET` with only `child_id` → returns completions for today in family TZ; cross-family `child_id` → 403.

Mock supabase-js. Assert the scope check runs before the insert. Use a fixed "now" via a Date override in tests.

- [ ] **Step 3: Run — expect FAIL**

`npm run test -w @sproutly/server`.

- [ ] **Step 4: Implement**

`packages/server/src/services/task-completions.ts`:
- `createTaskCompletion(db, ctx, req, now)`:
  1. Validate child ownership via `children` join (single query: `select id, family_id from children where id = ? and family_id = ctx.family_id`). If no row → throw `ApiError('FORBIDDEN', …)`.
  2. Determine `local_date` — either from request (validated ±1 day vs. `todayYmdInTz(ctx.timezone, now)`) or server-computed today.
  3. Try insert. On PG unique-violation (`23505`) on `(task_id, local_date)`, re-select the row and return `{ completion, idempotent: true }`. Otherwise return `{ completion, idempotent: false }`.
- `listTaskCompletions(db, ctx, req, now)`:
  1. Same child ownership check.
  2. Select `task_completions` where `child_id = ?` and `local_date = req.local_date ?? todayYmdInTz(...)`.

`packages/server/src/routes/task-completions.ts`:
- `POST /task-completions` — `authMiddleware({ requireFamily: true })`, parse body, call service, return.
- `GET /task-completions` — same middleware, parse query, call service.

Mount in `app.ts`.

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected diff: two new paths + `TaskCompletion`, `CreateTaskCompletionRequest`, `CreateTaskCompletionResponse` schemas.

Verify drift test: `npm run test -w @sproutly/api-contract`.

- [ ] **Step 7: App wrapper**

In `src/lib/api.ts`, add:
```
api.taskCompletions = {
  list: (params) => requestJson('GET', withQuery('/task-completions', params), { responseSchema: TaskCompletionsListResponse, auth: true }),
  create: (body) => requestJson('POST', '/task-completions', { body: CreateTaskCompletionRequest.parse(body), responseSchema: CreateTaskCompletionResponse, auth: true }),
}
```

- [ ] **Step 8: Swap `app/(parent)/today.tsx`**

Replace the two `task_completions` lines (82-85 read, 110 insert) with `api.taskCompletions.list(...)` and `api.taskCompletions.create(...)`. The optimistic-update pattern stays — on 2xx response, no action needed; on throw, revert `completedIds`.

- [ ] **Step 9: Manual smoke**

Run `npm run server:dev` and `npm start`. From parent Today: tap a task → it ticks; tap again (or reload) → still ticked; hit the same row from another device/session → no dup row in DB. Confirm Realtime still fires on the kid iPad (if reachable) — i.e. service-role inserts broadcast.

- [ ] **Step 10: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/ app/
git commit -m "feat(api): POST/GET /task-completions with idempotency; migrate today screen"
```

---

## Task 2: Day-roll pure logic in `packages/server/src/domain/day-roll.ts`

**Files:**
- Create: `packages/server/src/domain/day-roll.ts`
- Create: `packages/server/test/domain-day-roll.test.ts`

The goal of this task is to build a fully tested, **IO-free** module that encodes the rules documented in `wiki/concepts/day-roll.md`. The route handler orchestrates; the rules live here.

### Exports

- `SUCCESS_THRESHOLD = 0.6`.
- `STAGE_THRESHOLDS: ReadonlyMap<number, number>` — `7 → 2, 14 → 3, 21 → 4, 30 → 5`. Input: `successful_days` value AFTER the increment. Output: new `avatar_stage` or undefined.
- `datesBetween(fromExclusive: string | null, toInclusive: string, tz: string): string[]` — inclusive of `toInclusive`, exclusive of `fromExclusive`. If `fromExclusive` is null, return `[toInclusive]`. Used for catch-up.
- `wasSuccessful({ total, completed }): boolean` — `total > 0 && completed / total >= SUCCESS_THRESHOLD`.
- `computeStageAfterSuccess(currentStage, newSuccessfulDays): { stage, bumped }` — returns unchanged stage + `bumped: false` if no threshold crossed.
- `worstTimeSlotForMiss(tasksForDate, completionsForDate): 'morning' | 'afternoon' | 'evening' | null` — used only for the miss-simplify draft insight. Lowest completion ratio; ties resolve `morning < afternoon < evening`.
- Types:
  - `DayRollInput`: `{ date: string, tasksScheduled: Array<{id, time_slot, is_bonus, is_active}>, completionsForDate: Array<{task_id, id}>, child: { avatar_stage, successful_days, last_evaluated_date, pending_stage_transition } }`.
  - `DayRollOutput`: `{ date, total_tasks, completed_tasks, was_successful, next_successful_days, next_avatar_stage, stage_bumped, next_pending_stage_transition, missSimplifyDraft?: { worst_slot: 'morning'|'afternoon'|'evening' } }`.
- `computeDayRoll(input: DayRollInput): DayRollOutput` — combines the above. No IO.

### Rules enforced (translated from `wiki/concepts/day-roll.md` §3)

- Scheduled task count excludes `is_bonus=true` and `is_active=false`.
- `completed_tasks` counts only completions whose `task_id` is in the scheduled set (prevents bonus completions from inflating the ratio).
- If not successful, draft insight record is emitted by day-roll's orchestrator (next task), not by this pure layer — but the pure layer returns `missSimplifyDraft` so the caller knows whether + with which slot.
- `successful_days` only increases (if not successful, returned value equals current).
- `last_evaluated_date` is orchestrator's concern; not returned here (the orchestrator sets it to `date` unconditionally after a successful run).

- [ ] **Step 1 (TDD): Failing pure tests**

Cover:
- `wasSuccessful({ total: 0, completed: 0 })` → false. (Empty day is not a success.)
- `wasSuccessful({ total: 5, completed: 3 })` → true (60%).
- `wasSuccessful({ total: 5, completed: 2 })` → false.
- `STAGE_THRESHOLDS` snapshot: `[7,14,21,30]` → `[2,3,4,5]`. Values outside thresholds return `undefined`.
- `datesBetween(null, '2026-05-11', 'America/Los_Angeles')` → `['2026-05-11']`.
- `datesBetween('2026-05-08', '2026-05-11', 'America/Los_Angeles')` → `['2026-05-09','2026-05-10','2026-05-11']`.
- `datesBetween('2026-05-11', '2026-05-11', tz)` → `[]` (nothing to do).
- `computeStageAfterSuccess(1, 7)` → `{ stage: 2, bumped: true }`; `computeStageAfterSuccess(2, 8)` → `{ stage: 2, bumped: false }`.
- `worstTimeSlotForMiss` with tasks all in morning, 0 completions → `morning`; with tasks evenly split and partial completions, the slot with the lowest ratio wins; tie breaks by slot order.
- `computeDayRoll` happy path: 4 scheduled (two morning, one afternoon, one evening), 3 completed → `was_successful: true`, `next_successful_days: current+1`, `stage_bumped` only if threshold crossed.
- `computeDayRoll` miss path: 4 scheduled, 1 completed → `was_successful: false`, `next_successful_days: current`, `missSimplifyDraft: { worst_slot: <slot with 0 completions> }`.
- `computeDayRoll` zero-tasks path: `total_tasks=0` → `was_successful: false`, no draft insight (nothing to simplify).
- `computeDayRoll` ignores completions whose `task_id` isn't in the scheduled set.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `domain/day-roll.ts`**

Straight translation of the rules above. Import `dayjs` with the timezone plugin for `datesBetween` (reuse `packages/server/src/lib/local-date.ts`'s `ymdAddDays`). Otherwise no IO.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/domain/day-roll.ts packages/server/test/domain-day-roll.test.ts
git commit -m "feat(server): pure day-roll rules (success threshold, stages, miss-simplify slot)"
```

---

## Task 3: `/day-roll` route + service + app trigger

**Files:**
- Create: `packages/api-contract/src/endpoints/day-roll.ts`
- Create: `packages/server/src/services/day-roll.ts`
- Create: `packages/server/src/routes/day-roll.ts`
- Create: `packages/server/test/day-roll.test.ts`
- Modify: `packages/api-contract/src/index.ts`, `src/openapi.ts`, server `app.ts`, `src/lib/api.ts`, `app/(parent)/today.tsx` (or `app/_layout.tsx`) for the foreground trigger.

### Endpoint

- `POST /day-roll` — no body, or optional `{ child_id }` (defaults to the family's single child for V1). Returns summary of what rolled.
  - Auth: `requireFamily: true`. Requires at least one child to exist — if none, return `200 { rolled: false, reason: 'no_children', summaries: [] }`.
  - **Idempotent.** Calling twice in the same local date is a no-op the second time. Concurrency: if two clients call at once, both see consistent state because each `daily_summaries` upsert keys on `(child_id, local_date)` and `children.last_evaluated_date` only advances.

### Response shape

```
{
  rolled: boolean,                 // true iff at least one daily_summaries row was written or updated in this call
  today_local_date: string,        // YYYY-MM-DD in family TZ
  summaries: Array<{
    child_id: string,
    local_date: string,
    total_tasks: number,
    completed_tasks: number,
    was_successful: boolean,
    stage_bumped: boolean,
    new_avatar_stage: number,
    miss_simplify_draft_id: string | null,
  }>
}
```

### Service orchestrator

`packages/server/src/services/day-roll.ts` exports `runDayRollForFamily(db, ctx, now)`:
1. Load child(ren) in family. V1: 0 or 1.
2. If zero → return `{ rolled: false, reason: 'no_children', summaries: [], today_local_date }`.
3. For each child:
   a. Compute `today = todayYmdInTz(ctx.timezone, now)` and `yesterday = ymdAddDays(today, -1, ctx.timezone)`.
   b. Compute `datesToRoll = datesBetween(child.last_evaluated_date, yesterday, ctx.timezone)`. If empty → skip this child, no rows written.
   c. For each `date` in `datesToRoll`:
      i. Load tasks for the child (active, non-bonus, scheduled on `date` per recurrence) — reuse `src/domain/tasks.ts` `isTaskScheduledOn` by making it shared (see Note 1 below).
      ii. Load completions for the child on `date`.
      iii. `result = computeDayRoll({ date, tasksScheduled, completionsForDate, child })`.
      iv. `upsert` into `daily_summaries` by `(child_id, local_date)`. Set `total_tasks`, `completed_tasks`, `was_successful`, `simplified_from_miss=false` (existing column; day-roll doesn't set this to true here — that's the simplify apply flow).
      v. If `result.was_successful`, update `children` row: `successful_days`, `avatar_stage`, `pending_stage_transition=true` iff stage bumped. If not successful, leave those child fields alone.
      vi. If `result.missSimplifyDraft`, insert an `ai_insights` row with `suggestion_type='simplify_tomorrow'`, `family_id=ctx.family_id`, `task_id=null`, `is_applied=false`, `is_dismissed=false`, `passed_safety_filter=true`, `insight_text` = a short templated string like `"Try simplifying {{CHILD}}'s ${slot} tomorrow."` (pseudonymize child name — use `{{CHILD_NAME}}` placeholder like the spec says; but for draft insight we're not sending to Claude, so the real name CAN be used. Keep it simple: use the child's first name directly for drafts).
      vii. Update `children.last_evaluated_date = date`.
   d. After the loop, record a `summaries` entry per date processed.
4. Return `{ rolled: datesProcessed > 0, today_local_date, summaries }`.

**Note 1 (shared scheduling helper):** `isTaskScheduledOn` currently lives at `src/domain/tasks.ts` (device-side). Duplicate, don't share, for now — copy into `packages/server/src/domain/tasks.ts`. A future refactor can extract a common package. Rationale: `src/domain/` is RN-world, `packages/server/` is Node-world, no build linkage yet. Keep the two files in sync manually; test both.

**Note 2 (concurrency):** The update to `children.last_evaluated_date` must be gated on `children.last_evaluated_date IS NULL OR children.last_evaluated_date < date` to be safe under two concurrent callers. Use a conditional update (`.eq('id', child.id).lt('last_evaluated_date', date)` with an `IS NULL` branch). If the conditional update affects zero rows on a given date, it means another caller already processed that date — skip to the next date's loop iteration without error.

### Schemas

- `DayRollRequest = z.object({ child_id: Uuid.optional() })`.
- `DayRollSummary` — the per-date object above.
- `DayRollResponse = z.object({ rolled: boolean, today_local_date: LocalDate, summaries: z.array(DayRollSummary) })`.

- [ ] **Step 1: Schemas in api-contract**

Add schemas + `registerDayRoll(registry)` in `packages/api-contract/src/endpoints/day-roll.ts`. Export from `src/index.ts`. Wire into `src/openapi.ts`.

- [ ] **Step 2 (TDD): Failing route tests**

In `day-roll.test.ts`, cover:
- No token → 401.
- Family with 0 children → 200 `{ rolled: false, summaries: [] }`.
- Family with 1 child, `last_evaluated_date = yesterday - 1`, 4 scheduled / 3 completed yesterday → 200 `rolled: true`; DB shows `daily_summaries` row for yesterday, child's `successful_days` +1, `last_evaluated_date = yesterday`.
- Same call again → 200 `rolled: false` (nothing to do); child row unchanged.
- Catch-up: `last_evaluated_date = yesterday - 3` → 3 summary rows written; `successful_days` advanced correctly; `last_evaluated_date = yesterday`.
- Stage bump: current `successful_days = 6`, scheduled/completed for yesterday triggers success → response's summary has `stage_bumped: true, new_avatar_stage: 2`; child row shows `pending_stage_transition: true`.
- Miss → draft insight: 4 scheduled, 1 completed in morning → response summary has `miss_simplify_draft_id` (uuid); DB shows one `ai_insights` row for the family with `suggestion_type='simplify_tomorrow'`.

Mock the supabase-js client. Track writes across queries in a small in-memory store so the "call twice" assertion works.

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement service + route**

Service first (`services/day-roll.ts`), then a 20-line route handler (`routes/day-roll.ts`) that wires it up. Mount in `app.ts`.

Copy `isTaskScheduledOn` logic into `packages/server/src/domain/tasks.ts` (with a test reusing the existing scenarios from `src/domain/tasks.test.ts`).

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Regenerate and stage OpenAPI**

`npm run generate:openapi`. Expected: one new path + `DayRollRequest`, `DayRollResponse`, `DayRollSummary` schemas. Drift test passes.

- [ ] **Step 7: App wrapper**

`api.dayRoll = { run: () => requestJson('POST', '/day-roll', { body: {}, responseSchema: DayRollResponse, auth: true }) }`.

Send `{}` as the body (required by the POST with JSON body convention) even though all fields are optional.

- [ ] **Step 8: Wire the foreground trigger**

Two reasonable insertion points:
- **Preferred**: in `app/(parent)/today.tsx`'s `load()` (already runs `api.me.get()` etc.) — call `api.dayRoll.run()` once, **before** `api.tasks.list(...)` and friends, so the subsequent reads see freshly rolled stage/streak. Failure is non-fatal: log and continue.
- Alternative: in `app/_layout.tsx` under an AppState `active` listener. Rejected because today.tsx is the first screen the parent sees post-login; keeping it scoped to today.tsx matches the "lazy on app open" phrasing in the wiki.

Implement the preferred option. If the call throws, swallow with a `console.warn` and proceed; the UI must still render stale data rather than block.

- [ ] **Step 9: Manual smoke**

- Seed DB: one family, one child with `last_evaluated_date` set to 3 days ago, a handful of tasks, a handful of completions spread across days.
- Foreground parent Today. Expect a single `POST /day-roll` call on focus; check server logs show the call; check DB shows 3 `daily_summaries` rows, child's `successful_days` advanced, `last_evaluated_date = yesterday`.
- Foreground again. Expect the second call to log `rolled: false`.
- Simulate a bump: seed `successful_days=6`, yesterday successful → expect `avatar_stage=2`, `pending_stage_transition=true`. On the iPad kid view (if reachable), expect the evolution animation on next load (handled by the kid hook; not in scope for B2 wiring).

- [ ] **Step 10: Commit**

Stage includes the regenerated `packages/api-contract/openapi.yaml`.

```bash
git add packages/ src/ app/
git commit -m "feat(api): POST /day-roll with stage bumps + miss-simplify draft; trigger on Today foreground"
```

---

## Task 4: Update wiki

**Files:** `wiki/concepts/day-roll.md`, `wiki/entities/servers/rest-server.md`, `wiki/log.md`.

- [ ] **Step 1: `wiki/concepts/day-roll.md`**

Edit §Trigger and §"Who writes it" to reflect reality:
- Trigger: "Parent app calls `POST /day-roll` on Today screen foreground. Server performs the catch-up loop authoritatively using `family.timezone` — no device-clock math. Kid view inherits state through Realtime + reads on next foreground."
- Remove the final paragraph about "day-roll should move into an edge function or pg_cron" (that concern is now resolved — the REST server owns it).
- Keep the `day_roll(child, date)` procedure section as the canonical rule description; add a pointer to `packages/server/src/domain/day-roll.ts` for the implementation.

- [ ] **Step 2: `wiki/entities/servers/rest-server.md`**

Add two rows to the endpoint table:
- `POST /task-completions` — idempotent completion writes; server stamps `local_date` in family TZ.
- `GET /task-completions` — list for a child+date.
- `POST /day-roll` — authoritative daily bookkeeping; idempotent.

- [ ] **Step 3: `wiki/log.md`**

Append two entries (per-task, keeps log terse):

```
## [YYYY-MM-DD] add | rest api phase B2 part 1: /task-completions (idempotent)
- touched: packages/, src/lib/api.ts, app/(parent)/today.tsx
- reason: centralize completion writes; server stamps local_date

## [YYYY-MM-DD] add | rest api phase B2 part 2: /day-roll with stage bumps + miss-simplify draft
- touched: packages/server/src/domain/day-roll.ts, services/day-roll.ts, routes/day-roll.ts, app/(parent)/today.tsx, wiki/concepts/day-roll.md
- reason: day-roll moves server-side; device-clock math gone
```

- [ ] **Step 4: Commit**

Per prior plans, `wiki/` is gitignored but force-added in commits. Skip if the user's convention (observed in prior commits) leaves wiki uncommitted. Do NOT force-add without asking — prior Phase B1 commits did not include wiki files.

---

## Task 5: Green-check sweep

- [ ] **Step 1: Full test run**

From repo root: `npm run test`. Expected: all green. Record the test count.

- [ ] **Step 2: OpenAPI drift**

`npm run generate:openapi && git diff --exit-code packages/api-contract/openapi.yaml`. Expected: exit 0.

- [ ] **Step 3: Grep for lingering direct Supabase data calls**

```
grep -rn "supabase.from\|\.from('\|getParentClient().*from\|getParentClient().*rpc" app/ src/ \
  | grep -v node_modules \
  | grep -v "\.test\." \
  | grep -v "Array.from"
```

Acceptable remaining hits:
- `src/hooks/useKidScreenState.ts` — 4 reads (children, families, tasks, task_completions). Deferred by precondition.
- `src/hooks/useKidScreenState.ts` — 1 Realtime channel subscription. Intentional; Realtime stays on SDK.
- `app/(parent)/settings.tsx` — `kid_devices` selects / `create_pairing_code` RPC / `kid_devices` delete. **Not B2's concern**; waits for flexible-device-roles to land.

Any hit outside that list → investigate before acceptance.

- [ ] **Step 4: Manual end-to-end**

Parent phone, fresh DB state:
1. Fresh onboarding → Today screen.
2. Add a task for this morning → tap to complete → tick persists across app relaunch.
3. Background the app, advance the device clock one day → foreground → check DB: `daily_summaries` has a row; child's streak +1; if that crossed a threshold, avatar_stage advanced and `pending_stage_transition=true`.
4. Foreground again immediately → server response has `rolled: false`.
5. Induce a miss: seed a scheduled task for yesterday with zero completions → day-roll → `ai_insights` row with `suggestion_type='simplify_tomorrow'` exists.
6. Realtime: from another device/session, insert a completion — observe the kid iPad's animation fires (Realtime still works through service-role writes).

- [ ] **Step 5: No commit.** Verification only.

---

## Task 6: Close-out

- [ ] **Step 1: Delete dead code**

After Task 1's swap of `today.tsx`, `getParentClient` may only be needed in that file for auth-related calls. Check and remove unused imports.

Grep in `app/(parent)/today.tsx`: if no remaining `getParentClient` calls, delete the import.

- [ ] **Step 2: Commit if anything changed**

```bash
git add app/
git commit -m "chore: remove unused getParentClient imports after REST cutover"
```

If nothing to remove, skip.

---

## Acceptance for Phase B2

- `POST /task-completions`, `GET /task-completions`, `POST /day-roll` live and tested.
- Day-roll pure rules fully unit-tested in `packages/server/src/domain/day-roll.ts`.
- App parent surface has zero direct `supabase.from(...)` / `.rpc(...)` calls. Only auth + realtime on SDK.
- `openapi.yaml` is regenerated, committed, CI drift test green.
- Manual smoke confirms idempotency of both endpoints and correct stage bump / miss-simplify behavior.
- Wiki updated (if prior convention is to commit wiki).

---

## Risks

- **Realtime under service-role writes.** The spec asserts Realtime watches tables, not callers. If the manual smoke in Task 5 reveals the kid iPad stops animating, investigate `REPLICA IDENTITY` / publication settings before shipping. Fix path: ensure `public.task_completions` is in the Supabase realtime publication; it was in Phase A, so regression is unlikely.
- **Concurrent day-roll calls.** Two parents on two devices foreground at the same second. The conditional-update on `last_evaluated_date` (Note 2 above) makes the second call a no-op per date. Test this in Task 3 with an explicit concurrent-call test case.
- **Device-clock forward skew.** A user whose phone clock is ahead by a day won't affect day-roll: server computes today from `family.timezone` + server `Date()`. But the `POST /task-completions` 422 for `local_date` > today+1 assumes the client's supplied date is wrong; defaulting to server-computed `local_date` (no client supply) avoids the edge case. Preferred client behavior: never send `local_date`.
- **Duplicate `isTaskScheduledOn` logic.** Copied between `src/domain/tasks.ts` and `packages/server/src/domain/tasks.ts`. Drift risk. Mitigate: copy the tests too, CI runs both. Revisit in a later refactor if it becomes painful.
- **Miss-simplify draft names.** Drafts are not sent to Claude — using the child's real first name in `insight_text` is safe. If V1 ever decides drafts must also be pseudonymized, use `{{CHILD_NAME}}` placeholder like the Claude path.
