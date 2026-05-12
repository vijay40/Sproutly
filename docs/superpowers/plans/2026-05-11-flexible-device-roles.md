# Flexible Device Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two-device role model (parent phone + paired kid iPad) into a single app where any device can host parent UI, kid UI, or both. The kid-device pairing subsystem is deleted. Kid view reads/writes flow through the same REST API the parent uses — closing the REST cutover in the same pass.

**Architecture:** One authenticated principal (parent magic-link). Kid view is a UI mode backed by a session-level `mode` flag. A 4-digit PIN (SecureStore + salted SHA-256 via `expo-crypto`) gates exit from kid view. Phone-sized kid layouts added via a `<600px` breakpoint (already partially shipped). The kid hook (`useKidScreenState`) calls REST endpoints for reads and task-completion writes; the only Supabase SDK calls left in the app are `auth` and the Realtime `channel(...)` subscription.

**Tech Stack:** React Native / Expo (expo-router), TypeScript, Supabase (Postgres + Auth + Realtime), Vitest, expo-crypto, expo-secure-store. REST client in `src/lib/api.ts` (shipped).

**Spec:** [`docs/superpowers/specs/2026-05-10-flexible-device-roles-design.md`](../specs/2026-05-10-flexible-device-roles-design.md)

**Already in place (do not redo):**
- Phone-sized kid scenes for K2/K3/K4 (and ExitLock part) — done.
- `src/lib/kidLock.ts` with `setPin`, `verifyPin`, `hasPin`, `clearPin` — done (lockout helpers NOT yet — Task 1).
- `src/ui/PinPad.tsx` + `PinDots` — done.
- `app/(first-launch)/create-pin.tsx` and `confirm-pin.tsx` — done.
- Onboarding PIN row + "Kid view" pill on parent Today (button exists but doesn't call `enterKidView()` yet — wired in Task 2) — partial.
- REST server + `api.*` client: `api.me`, `api.children`, `api.tasks`, `api.taskCompletions`, `api.dayRoll`, `api.insights`, `api.cosmetics`, `api.families`, `api.dailySummaries` all shipped and wired into parent screens.

**What remains** (Task numbering below): PIN **lockout** helpers; mode entry/exit helpers + Kid-view button wiring; Exit PIN screen; Forgot PIN; Parent PIN settings; ExitLock re-route; **useKidScreenState REST rewrite**; kid-view task tap via `api.taskCompletions.create`; parent-session auth gate on `(kid)/_layout`; first-launch collapse; `settings.tsx` pairing cleanup; pair-system file deletes; SecureStore kid-token cleanup; `getKidClient` deletion; `0006_drop_pairing.sql`; wiki updates; regression sweep.

---

## File Structure

**New files**
- `src/lib/kidLock.test.ts` — PIN module tests (existing helpers + new lockout helpers).
- `app/(kid)/exit-pin.tsx` — Exit PIN pad screen (default, wrong, locked).
- `app/(kid)/forgot-pin.tsx` — Magic-link re-auth to clear PIN.
- `app/(parent)/pin-settings.tsx` — Set / change / remove PIN.
- `supabase/migrations/0006_drop_pairing.sql` — Drop `kid_devices`, kid RLS, pairing RPC.

**Modified files**
- `src/lib/kidLock.ts` — add `recordFailure`, `clearFailures`, `lockoutMsRemaining`.
- `src/lib/mode.ts` — add `enterKidView()`, `exitKidView()`.
- `src/lib/secureStore.ts` — delete `getKidToken` / `saveKidAuth` / `clearKidAuth`.
- `src/lib/supabase.ts` — delete `getKidClient()`.
- `src/hooks/useKidScreenState.ts` — REST rewrite: `api.*` reads + `api.dayRoll.run({})` on foreground + Realtime via `getParentClient()`.
- `src/ui/kid/parts/ExitLock.tsx` — navigate to `/(kid)/exit-pin`.
- `app/_layout.tsx` — routing effect respects persisted kid mode.
- `app/(kid)/_layout.tsx` — require parent session; keep `__DEV__` bypass.
- `app/(kid)/display.tsx` — tap handler calls `api.taskCompletions.create({ task_id, child_id })`.
- `app/(first-launch)/index.tsx` — collapse mode chooser; redirect to magic-link or onboarding.
- `app/(first-launch)/_layout.tsx` — no branching.
- `app/(parent)/settings.tsx` — remove `kid_devices` select/delete and `create_pairing_code` RPC; add link to `/(parent)/pin-settings`.
- `app/(parent)/TodayTopHeader.tsx` — Kid view button calls `enterKidView()` before navigating.
- `.env.example` — remove `EXPO_PUBLIC_SERVER_URL`.
- `src/ui/index.ts` — drop exports for deleted pair components.
- Wiki pages per Task 16.

**Deleted files**
- `app/(kid)/pair.tsx`.
- `src/ui/PairCode.tsx`, `src/ui/PairCodeSheet.tsx`, `src/ui/CodeEntry.tsx`.
- `src/ui/kid/scenes/PrePairScene.tsx`.
- `src/lib/server.ts` (client shim for the obsolete pairing server).
- `wiki/concepts/pairing-flow.md`, `wiki/entities/tables/kid_devices.md`, `wiki/entities/servers/server.md` (if it still exists — it was superseded by `rest-server.md` during REST Phase A).

**NOT deleted** (important — both existed in an earlier draft): `packages/server/` stays (REST server). The repo-root `server/` is already gone from REST Phase A.

---

## Task 1 — PIN module: lockout counter

**Files:**
- Modify: `src/lib/kidLock.ts`
- Create: `src/lib/kidLock.test.ts`

Add attempt-counter and lockout-timestamp helpers. SecureStore keys namespaced under `kid.lock.*`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/kidLock.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    getItemAsync: vi.fn(async (k: string) => store.get(k) ?? null),
    deleteItemAsync: vi.fn(async (k: string) => { store.delete(k); }),
    __reset: () => store.clear(),
  };
});
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  getRandomBytesAsync: vi.fn(async (n: number) => new Uint8Array(n).fill(1)),
  digestStringAsync: vi.fn(async (_a: string, s: string) => `H(${s})`),
}));

import * as SecureStore from 'expo-secure-store';
import { setPin, verifyPin, clearPin, hasPin, recordFailure, clearFailures, lockoutMsRemaining } from './kidLock';

beforeEach(() => { (SecureStore as any).__reset(); });

describe('kidLock PIN', () => {
  it('verifies the same PIN after setPin', async () => {
    await setPin('1234');
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyPin('9999')).toBe(false);
  });
  it('hasPin reflects state', async () => {
    expect(await hasPin()).toBe(false);
    await setPin('1111');
    expect(await hasPin()).toBe(true);
    await clearPin();
    expect(await hasPin()).toBe(false);
  });
});

describe('kidLock lockout', () => {
  it('no lockout until 3 failures', async () => {
    await recordFailure();
    await recordFailure();
    expect(await lockoutMsRemaining()).toBe(0);
  });
  it('30s lockout at 3 failures', async () => {
    await recordFailure(); await recordFailure(); await recordFailure();
    const ms = await lockoutMsRemaining();
    expect(ms).toBeGreaterThan(29_000);
    expect(ms).toBeLessThanOrEqual(30_000);
  });
  it('clearFailures resets', async () => {
    await recordFailure(); await recordFailure(); await recordFailure();
    await clearFailures();
    expect(await lockoutMsRemaining()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/lib/kidLock.test.ts` → FAIL (`recordFailure is not exported`).

- [ ] **Step 3: Extend `src/lib/kidLock.ts`**

Add new exports. Store `kid.lock.failures` (int) and `kid.lock.lockout_until` (epoch ms). `recordFailure` increments; on 3rd increment sets `lockout_until = now + 30_000` and resets counter. `lockoutMsRemaining` returns `max(0, lockout_until - now)`.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/kidLock.ts src/lib/kidLock.test.ts
git commit -m "feat(lock): rate-limit exit-PIN failures with 30s lockout"
```

---

## Task 2 — Mode session helpers + TodayTopHeader wiring

**Files:**
- Modify: `src/lib/mode.ts`
- Modify: `app/(parent)/TodayTopHeader.tsx`

Add `enterKidView()` (sets mode → `'kid'`) and `exitKidView()` (sets → `'parent'`). Wire the existing "Kid view" button in TodayTopHeader to call `enterKidView()` before navigating — right now it navigates without setting the flag, which breaks persistence (Task 10's relaunch semantics).

- [ ] **Step 1: Add helpers** — thin wrappers around `setMode`.
- [ ] **Step 2: Wire button** — `onPress` now awaits `enterKidView()` then navigates.
- [ ] **Step 3: Manual smoke** — tap "Kid view" → kid scene → kill app → reopen → still in kid view (relies on Task 10 for full relaunch but AsyncStorage should reflect mode=kid even now).
- [ ] **Step 4: Commit** — `feat(mode): enterKidView / exitKidView helpers; wire Kid view button`.

---

## Task 3 — ExitLock routes to PIN pad

**Files:**
- Modify: `src/ui/kid/parts/ExitLock.tsx`

Change the long-press/press handler from `router.replace('/(parent)/today')` to `router.push('/(kid)/exit-pin')`. The PIN screen (Task 4) owns the exit decision.

- [ ] **Step 1: Edit handler.**
- [ ] **Step 2: Commit** — `refactor(kid): route exit lock to PIN pad`.

---

## Task 4 — Exit PIN screen: default + wrong states

**Files:**
- Create: `app/(kid)/exit-pin.tsx`

Reuse `PinPad` + `PinDots`. On 4 digits: call `verifyPin`. Correct → `exitKidView()` → `router.replace('/(parent)/today')` + `clearFailures()`. Wrong → `recordFailure()`, shake animation, red dots, label "Incorrect PIN · N attempts remaining" (derive N from `lockoutMsRemaining` + current counter — or just say "Try again").

No-PIN-set edge case: if `hasPin()` returns false when the screen opens, skip the pad and `Alert.alert` a confirm — "Exit kid view?" yes/no — then `exitKidView()` + navigate. This preserves the spec's "No PIN configured → confirm dialog only."

- [ ] **Step 1: Scaffold** screen rendering `PinDots` + `PinPad` + `Forgot PIN?` link.
- [ ] **Step 2: Wire verify + failure flow** per above.
- [ ] **Step 3: No-PIN branch** with confirm dialog.
- [ ] **Step 4: Manual smoke** — correct → Today; wrong → dots red.
- [ ] **Step 5: Commit** — `feat(kid): exit PIN pad default + wrong states`.

---

## Task 5 — Exit PIN: lockout state

**Files:**
- Modify: `app/(kid)/exit-pin.tsx`

Poll `lockoutMsRemaining()` on mount and after each failure. If >0: render "Too many attempts" layout with live MM:SS countdown; disable keypad; show a red warning circle. When the tick hits 0, re-enable the keypad and clear the countdown state.

- [ ] **Step 1: Add `useEffect` 1s tick + `useState<number>` remaining.**
- [ ] **Step 2: Conditional render** locked view vs active view.
- [ ] **Step 3: Manual smoke** — 3 wrong attempts → countdown → keypad disabled → 30s later re-enabled.
- [ ] **Step 4: Commit** — `feat(kid): exit PIN lockout state`.

---

## Task 6 — Forgot PIN screen

**Files:**
- Create: `app/(kid)/forgot-pin.tsx`

Prefill parent's email from `getParentClient().auth.getSession()`. Tap "Send magic link" → `signInWithOtp({ email })` → show "check your email" card. When the magic link is consumed (existing `consumeAuthSessionFromUrl` in `src/lib/supabase.ts` handles the return), clear the PIN and navigate back to `/(kid)/display`.

- [ ] **Step 1: Scaffold UI** with email card + Send button.
- [ ] **Step 2: Wire OTP send.**
- [ ] **Step 3: Extend the link consumer** so that when a deep link is consumed while we're on `forgot-pin`, call `clearPin()` then navigate.
- [ ] **Step 4: Manual smoke** — send → tap link in email → app opens → PIN cleared.
- [ ] **Step 5: Commit** — `feat(kid): forgot-PIN recovery via magic-link`.

---

## Task 7 — Parent PIN settings screen

**Files:**
- Create: `app/(parent)/pin-settings.tsx`
- Modify: `app/(parent)/settings.tsx` — link the "Kid-view PIN" row to push `/(parent)/pin-settings`.

Three actions, conditional on `hasPin()`:
- Set (no PIN yet): reuse create-pin/confirm-pin flow.
- Change: prompt for current PIN, then new + confirm.
- Remove: prompt for current PIN, then `clearPin()` + `clearFailures()`.

- [ ] **Step 1: Scaffold** conditional UI.
- [ ] **Step 2: Wire Change** reusing create/confirm screens via params or inline.
- [ ] **Step 3: Wire Remove** with current-PIN verification.
- [ ] **Step 4: Manual smoke** each path.
- [ ] **Step 5: Commit** — `feat(parent): PIN management in settings`.

---

## Task 8 — useKidScreenState REST rewrite

**Files:**
- Modify: `src/hooks/useKidScreenState.ts`
- Modify/replace: existing test file if present (else none currently).

**The big one.** Today the hook uses `getKidClient()` for 4 parallel reads and a Realtime channel. After this task, reads use the REST API; Realtime stays on Supabase SDK via `getParentClient()`.

**Changes:**
- `import { api } from '../lib/api'` (remove `getKidClient` import).
- Initial load block: call `api.dayRoll.run({}).catch(warn)`, then in parallel:
  - `api.me.get()` → pull `timezone`, `family_id`.
  - `api.children.list()` → pick first child (V1: 0 or 1).
  - `api.tasks.list({ child_id: ch.id, is_active: 'true', is_bonus: 'false' })`.
  - `api.taskCompletions.list({ child_id: ch.id, local_date: todayLocalDate(me.timezone) })`.
- Map REST response rows to the existing `ChildRow` / `FamilyRow` / `TaskRow` / `TaskCompletionRow` shapes the hook already uses. Where the REST response shape is a strict superset/subset, adapt at the boundary (small shim inside the effect). Do not reshape `deriveKidState` — keep its input type stable.
- Realtime: swap `getKidClient()` → `getParentClient()`. Keep the channel name, filter, and `postgres_changes` handler unchanged.
- `getKidChildId()` → replaced by `children[0]?.id` from `api.children.list()`. The `kid.child_id` SecureStore key becomes unused (cleanup in Task 13).
- Cache read-through (`loadKidCache` / `saveKidCache`) keeps working — same data shapes.

- [ ] **Step 1: Rewrite the initial load effect** — API calls + shape adapters.
- [ ] **Step 2: Rewrite the Realtime effect** — parent client.
- [ ] **Step 3: Remove `getKidChildId` usage** — derive from children list.
- [ ] **Step 4: TypeScript sanity** — `npx tsc --noEmit` passes.
- [ ] **Step 5: Tests** — if a hook test existed, update mocks from `getKidClient` to `api.*`. If none existed, skip (no new test required; parent screens already exercise these endpoints).
- [ ] **Step 6: Manual smoke** — enter kid view → scene renders with live REST-sourced data → add a task in parent view → kid view reflects it after next foreground.
- [ ] **Step 7: Commit** — `refactor(kid): migrate useKidScreenState reads to REST; realtime via parent client`.

---

## Task 9 — Kid-view task tap writes via REST

**Files:**
- Modify: `app/(kid)/display.tsx` (or wherever the active task-tap handler lives — confirm via grep when starting the task).

Add an `onPress` that calls `api.taskCompletions.create({ task_id, child_id })`. Optimistic update: add `task_id` to local completion state immediately; on throw, remove it and show a brief toast. Realtime echo will dedupe naturally via the existing reducer.

No shared `markTaskComplete` helper — `api.taskCompletions.create` is the shared path.

- [ ] **Step 1: Locate** the real tap handler (likely passes through to the scene or a TaskTile component).
- [ ] **Step 2: Wire the call** with optimistic + rollback.
- [ ] **Step 3: Manual smoke** — kid tap → checks immediately → row in DB → realtime echo on second device fires celebration.
- [ ] **Step 4: Commit** — `feat(kid): tap-to-complete via POST /task-completions`.

---

## Task 10 — Kid layout parent-session gate + persist kid view

**Files:**
- Modify: `app/(kid)/_layout.tsx`
- Modify: `app/_layout.tsx`

`(kid)/_layout.tsx` today checks for kid token. Replace with: await `getParentClient().auth.getSession()`; if absent, redirect to `/(first-launch)` magic-link; else render. Keep the `__DEV__` bypass to `/display` intact.

`app/_layout.tsx` routing effect: at boot, if `mode === 'kid'` AND a parent session exists, route to `/(kid)/display` (regardless of previous segment).

- [ ] **Step 1: Update `(kid)/_layout.tsx`** auth gate.
- [ ] **Step 2: Update `_layout.tsx`** routing.
- [ ] **Step 3: Manual smoke** — enter kid view, kill app, reopen → lands in kid view without parent flash.
- [ ] **Step 4: Commit** — `fix(routing): parent-session gate on (kid); persist kid view across relaunch`.

---

## Task 11 — First-launch collapse

**Files:**
- Modify: `app/(first-launch)/index.tsx`
- Modify: `app/(first-launch)/_layout.tsx`

`index.tsx` becomes: if no parent session → redirect to `parent-auth` (magic-link screen); else if no family row (`api.me.get().has_onboarded === false`) → redirect to `parent-onboarding`; else → redirect to `/(parent)/today`. Delete the mode-chooser UI.

`_layout.tsx`: ensure no branching — just a stack.

- [ ] **Step 1: Rewrite `index.tsx`** as a thin effect-based redirect.
- [ ] **Step 2: Simplify `_layout.tsx`** if it has any mode-aware logic.
- [ ] **Step 3: Manual smoke** — fresh install → magic-link → onboarding → Today. Signed-in no-onboarding → onboarding. Signed-in + onboarded → Today.
- [ ] **Step 4: Commit** — `feat(onboarding): single first-launch path`.

---

## Task 12 — Settings.tsx pairing removal

**Files:**
- Modify: `app/(parent)/settings.tsx`

Delete:
- The `kid_devices` select (the "Paired devices" section load).
- The `create_pairing_code` RPC call and its button.
- The `kid_devices` delete handler.

Replace: the "Paired devices" panel with a "Kid view" section that links to `/(parent)/pin-settings` (Task 7 target). If the session-level timezone display or other unaffected parts of settings exist, leave them alone.

- [ ] **Step 1: Delete pairing UI + handlers.**
- [ ] **Step 2: Add PIN settings link.**
- [ ] **Step 3: Manual smoke** — settings loads without errors; PIN link navigates.
- [ ] **Step 4: Commit** — `refactor(parent): remove kid_devices/pairing from settings; add PIN link`.

---

## Task 13 — Delete pair system files + secureStore + supabase kid client

**Files:**
- Delete: `app/(kid)/pair.tsx`, `src/ui/PairCode.tsx`, `src/ui/PairCodeSheet.tsx`, `src/ui/CodeEntry.tsx`, `src/ui/kid/scenes/PrePairScene.tsx`, `src/lib/server.ts`.
- Modify: `src/lib/supabase.ts` — delete `getKidClient()`.
- Modify: `src/lib/secureStore.ts` — delete `getKidToken`, `saveKidAuth`, `clearKidAuth`, and the `kid.child_id` helper if it's kid-token-era only. Keep any PIN-related keys.
- Modify: `src/ui/index.ts` (or wherever UI exports live) — drop removed component exports.
- Modify: `.env.example` — remove `EXPO_PUBLIC_SERVER_URL`.

- [ ] **Step 1: Delete files.**
- [ ] **Step 2: Fix resulting TypeScript errors.** TS will highlight every leftover import.
- [ ] **Step 3: Verify grep clean** —
  `grep -rn "getKidClient\|kid_devices\|pairing_code\|EXPO_PUBLIC_SERVER_URL\|markTaskComplete" app/ src/ | grep -v node_modules | grep -v "\.test\."`
  Should return zero hits.
- [ ] **Step 4: Run tests** — `npm run test` all green.
- [ ] **Step 5: Commit** — `refactor: remove kid-device pairing subsystem from client`.

---

## Task 14 — Supabase migration: drop pairing schema

**Files:**
- Create: `supabase/migrations/0006_drop_pairing.sql`

Drop (in order, with `IF EXISTS` for idempotence on already-cleaned DBs):
1. RLS policies from `0004_rls_kid_device.sql`.
2. The pairing RPC from `0003_pairing_rpc.sql`.
3. The `kid_devices` table.

Older migrations stay in history; this one tears down forward.

- [ ] **Step 1: Write migration.**
- [ ] **Step 2: Apply locally** — `supabase db reset` applies clean.
- [ ] **Step 3: Commit** — `feat(db): drop kid-device pairing schema`.

---

## Task 15 — Wiki updates

**Files:**
- Delete: `wiki/concepts/pairing-flow.md`, `wiki/entities/tables/kid_devices.md`.
- Delete if still present: `wiki/entities/servers/server.md` (replaced by `rest-server.md` during REST Phase A — verify).
- Modify: `wiki/synthesis/architecture.md`, `wiki/synthesis/security-model.md`, `wiki/synthesis/v1-scope.md`, `wiki/concepts/kid-screen-states.md`, `wiki/entities/servers/rest-server.md` (remove the "Known gaps" note about the kid hook — it's now REST), `wiki/index.md`.
- Append: `wiki/log.md`.

Edits match the §"Wiki touches" bullets in the spec. Key invariant flips in `v1-scope.md`: soften #1, remove #7.

- [ ] **Step 1: Apply edits.**
- [ ] **Step 2: Commit** — `docs(wiki): drop pairing pages; update invariants for flexible roles`.

Note: `wiki/` is gitignored in this repo; prior plans have committed wiki only selectively. Either force-add or note in the log file; follow the convention used in recent commits (Phase B commits have NOT included wiki).

---

## Task 16 — Green-check sweep

- [ ] **Step 1: Full test run** — `npm run test` at repo root. All green.
- [ ] **Step 2: OpenAPI sanity** — `npm run generate:openapi && git diff --exit-code packages/api-contract/openapi.yaml`. Exit 0. No contract changes expected.
- [ ] **Step 3: Grep checks**
  ```
  grep -rn "supabase\.from\|getKidClient\|kid_devices\|pairing_code\|EXPO_PUBLIC_SERVER_URL\|markTaskComplete" app/ src/ | grep -v node_modules | grep -v "\.test\."
  ```
  Must return zero. (Realtime `supabase.channel(...)` in `useKidScreenState.ts` is allowed and not matched by the grep above.)
- [ ] **Step 4: Manual smoke** (per spec §Testing):
  1. Fresh install → magic-link → onboard → Today.
  2. "Kid view" → scene renders with REST-sourced data.
  3. Tap task in kid view → ticks → parent Today reflects after realtime.
  4. Exit → 3 wrong → 30s lockout → correct → parent home.
  5. Kill app in kid view → reopen → lands in kid view.
  6. Parent Settings → set / change / remove PIN.
  7. Forgot PIN → magic-link → PIN cleared.
  8. Network off → kid tap → optimistic celebration → syncs on reconnect.
- [ ] **Step 5: Commit any follow-up fixes individually.**

---

## Acceptance

- No kid JWT anywhere. No pairing. No repo-root `server/`. `src/lib/server.ts` gone.
- `useKidScreenState` sources every read from REST; only `supabase.channel(...)` and `supabase.auth.*` remain on the SDK.
- PIN flows (create / confirm / exit / forgot / settings) all live.
- Schema migration applies cleanly.
- Invariants #1 and #7 in `v1-scope.md` updated.
- All tests green.

---

## Self-review notes

- Spec §Scope-In: covered by Tasks 1–14. §Scope-Out untouched.
- Spec §Invariant changes: wired into Task 15.
- No placeholder tasks. Concrete test code only where non-obvious (Task 1). UI scaffolding described behaviorally.
- Type consistency: `enterKidView` / `exitKidView` introduced in Task 2 and referenced in Tasks 4, 10. `recordFailure` / `clearFailures` / `lockoutMsRemaining` introduced in Task 1 and referenced in Tasks 4, 5, 7. `api.taskCompletions.create` referenced in Tasks 9 and (existing) parent screens.
- Sequencing: data-layer (1–2) → UI (3–7) → kid hook & writes (8–9) → routing (10–11) → deletes (12–14) → docs (15) → sweep (16). Each task independently committable.
