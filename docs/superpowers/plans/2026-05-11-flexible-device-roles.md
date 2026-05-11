# Flexible Device Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two-device role model (parent phone + paired kid iPad) into a single app where any device can host parent UI, kid UI, or both. The kid-device pairing subsystem is deleted.

**Architecture:** One authenticated principal (parent magic-link). Kid view is a UI mode backed by a `mode` flag. A 4-digit PIN (SecureStore + salted SHA-256 via `expo-crypto`) gates exit from kid view. Phone-sized kid layouts added via a `width < 600` breakpoint.

**Tech Stack:** React Native / Expo (expo-router), TypeScript, Supabase (Postgres + Auth + Realtime), Vitest, expo-crypto, expo-secure-store.

**Spec:** [`docs/superpowers/specs/2026-05-10-flexible-device-roles-design.md`](../specs/2026-05-10-flexible-device-roles-design.md)

**Prior work already in place (do not redo):**
- Phone-sized kid scenes for K2/K3/K4 (and ExitLock part) — done.
- `src/lib/kidLock.ts` (setPin/verifyPin/hasPin/clearPin) — done.
- `src/ui/PinPad.tsx` + `PinDots` — done.
- `app/(first-launch)/create-pin.tsx` and `confirm-pin.tsx` — done.
- Onboarding PIN row + "Kid view" pill on parent Today — done.

What remains is: PIN **exit** flow (pad + lockout + forgot), Settings PIN management, mode-flag wiring for kid view entry/exit, markTaskComplete shared helper + wiring kid taps, server-side and schema cleanup (drop pairing), wiki/spec housekeeping, tests.

---

## File Structure

**New files**
- `app/(kid)/exit-pin.tsx` — Exit PIN pad screen (states: default, wrong, locked).
- `app/(kid)/forgot-pin.tsx` — Magic-link re-auth to clear PIN.
- `app/(parent)/pin-settings.tsx` — Set / change / remove PIN.
- `src/domain/markTaskComplete.ts` — Pure + IO-wrapped helper, shared by parent + kid view.
- `src/domain/markTaskComplete.test.ts` — Unit tests.
- `src/lib/kidLock.test.ts` — Tests for PIN module (hash determinism, verify, lockout counter).
- `src/lib/kidLock.ts` — Extend with lockout counter + timestamp functions.
- `supabase/migrations/0006_drop_pairing.sql` — Drop kid_devices, RPC, kid RLS.

**Modified files**
- `app/_layout.tsx` — Update routing effect for the new mode semantics (persisted kid mode reopens kid; ignore old pairing-era checks).
- `app/(first-launch)/_layout.tsx` — No branching; magic-link is the only entry.
- `app/(first-launch)/index.tsx` — Remove mode chooser, redirect to magic-link if unauthenticated.
- `app/(kid)/_layout.tsx` — Require parent session; dev bypass stays.
- `app/(kid)/display.tsx` — Kid tap calls `markTaskComplete`; add exit-pin nav from ExitLock.
- `src/lib/mode.ts` — Mode is session-level, not first-launch-level; add `enterKidView()`/`exitKidView()`.
- `src/lib/secureStore.ts` — Delete kid-token helpers.
- `src/lib/supabase.ts` — Delete `getKidClient()`; all consumers use `getParentClient()`.
- `src/ui/kid/parts/ExitLock.tsx` — Route to `/(kid)/exit-pin` instead of `/(parent)/today`.
- `src/hooks/useKidScreenState.ts` — Use parent client; drop kid-token logic.
- `src/ui/kid/scenes/*` — Confirm `width < 600` breakpoints (already partially done).
- Wiki pages per spec.

**Deleted files**
- `app/(first-launch)/parent-auth.tsx` — superseded by magic-link-only first-launch.
  **Wait** — keep `parent-auth.tsx` (magic-link screen). What goes away is the mode-chooser splash.
- `app/(kid)/pair.tsx` (if exists), `src/ui/PairCode.tsx`, `src/ui/PairCodeSheet.tsx`, `src/ui/CodeEntry.tsx`.
- `src/ui/kid/scenes/PrePairScene.tsx`.
- `src/lib/server.ts`.
- `server/` directory.
- `supabase/migrations/0003_pairing_rpc.sql` / `0004_rls_kid_device.sql` — **kept** as history. New migration `0006_drop_pairing.sql` tears down.

---

## Task 1 — PIN module: lockout counter

**Files:**
- Modify: `src/lib/kidLock.ts`
- Test: `src/lib/kidLock.test.ts` (create)

Add attempt-counter and lockout-timestamp helpers so the exit flow can rate-limit. Keep SecureStore keys namespaced under `kid.lock.*`.

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

Run: `npx vitest run src/lib/kidLock.test.ts`
Expected: FAIL — `recordFailure is not exported`.

- [ ] **Step 3: Extend `src/lib/kidLock.ts`**

Add the new exports. Store `kid.lock.failures` (int) and `kid.lock.lockout_until` (epoch ms). `recordFailure` increments; on 3rd increment sets `lockout_until = now + 30_000` and resets counter. `lockoutMsRemaining` returns `max(0, lockout_until - now)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kidLock.test.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kidLock.ts src/lib/kidLock.test.ts
git commit -m "feat(lock): rate-limit exit-PIN failures with 30s lockout"
```

---

## Task 2 — Shared `markTaskComplete` helper

**Files:**
- Create: `src/domain/markTaskComplete.ts`
- Create: `src/domain/markTaskComplete.test.ts`

Pure wrapper + Supabase call. Idempotent on `(task_id, local_date, child_id)` via an upsert.

- [ ] **Step 1: Failing test for shape + idempotency** — test the payload builder (pure function) that composes the row to upsert. Assert `{ task_id, child_id, local_date, completed_at, marked_by_parent: true }`.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** `buildCompletionRow(taskId, childId, now, timezone)` using `src/lib/time.ts` for today's date. Export `markTaskComplete(args)` that upserts via parent client onto `(task_id, local_date, child_id)` conflict target. Keep the IO thin; the payload builder is what we test.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit** — `feat(domain): shared markTaskComplete helper`.

---

## Task 3 — Mode flag API

**Files:**
- Modify: `src/lib/mode.ts`
- Create: `src/lib/mode.test.ts`

Add `enterKidView()` (sets mode to `kid`), `exitKidView()` (sets mode back to `parent`). Tests mock SecureStore, assert round-trip.

- [ ] **Step 1: Test** — round-trip setters/getters, both semantics.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(mode): session-level enter/exit kid view helpers`.

---

## Task 4 — ExitLock wires to PIN pad

**Files:**
- Modify: `src/ui/kid/parts/ExitLock.tsx`

Change the `onPress` to push `/(kid)/exit-pin` (do not `router.replace` to parent Today). No test — trivial nav.

- [ ] **Step 1: Edit onPress.**
- [ ] **Step 2: Commit** — `refactor(kid): route exit lock to PIN pad`.

---

## Task 5 — Exit PIN screen: default + wrong states

**Files:**
- Create: `app/(kid)/exit-pin.tsx`

Reuse `PinPad` + `PinDots`. On 4 digits entered: `verifyPin`. Success → `exitKidView()` → `router.replace('/(parent)/today')`. Failure → `recordFailure()`, shake, red dots, "Incorrect PIN · N attempts remaining" (derive from counter). When lockout kicks in, the next task handles the UI.

- [ ] **Step 1: Scaffold** screen rendering `PinDots` + `PinPad` + `Forgot PIN?` link.
- [ ] **Step 2: Wire verify flow** per above.
- [ ] **Step 3: Manual smoke** — enter correct PIN → lands on Today. Enter wrong → dots go red.
- [ ] **Step 4: Commit** — `feat(kid): exit PIN pad default + wrong states`.

---

## Task 6 — Exit PIN: lockout state

**Files:**
- Modify: `app/(kid)/exit-pin.tsx`

Poll `lockoutMsRemaining()` on mount and after each failure. If >0: render the "Too many attempts" layout with a live MM:SS countdown; disable keypad; show a red warning circle. When it ticks to 0, re-enable.

- [ ] **Step 1: Add `useEffect` tick** (1s interval), `useState<number>` remaining.
- [ ] **Step 2: Conditional render** locked view vs active view.
- [ ] **Step 3: Manual smoke** — force 3 wrong attempts → countdown appears → disables → after 30s re-enables.
- [ ] **Step 4: Commit** — `feat(kid): exit PIN lockout state`.

---

## Task 7 — Forgot PIN screen

**Files:**
- Create: `app/(kid)/forgot-pin.tsx`

UI from Figma `16 · Forgot PIN`. Prefill parent's email from the current session. Tap "Send magic link" → `supabase.auth.signInWithOtp({ email })` → show a "check your email" card. When the magic link is consumed (existing `consumeAuthSessionFromUrl` in `supabase.ts`), clear the PIN and route back to `(kid)/display`.

- [ ] **Step 1: Scaffold UI** with email card + Send button.
- [ ] **Step 2: Wire OTP send.**
- [ ] **Step 3: Extend `consumeAuthSessionFromUrl`** (or a dedicated handler) so that when a deep link is consumed while we're on `forgot-pin`, we call `clearPin()` then navigate back.
- [ ] **Step 4: Manual smoke** — send link → tap in email → app opens → PIN cleared.
- [ ] **Step 5: Commit** — `feat(kid): forgot PIN recovery via magic-link`.

---

## Task 8 — Kid view writes: wire task tap

**Files:**
- Modify: `app/(kid)/display.tsx` (or the actual task-tap location — check `src/hooks/useKidScreenState.ts`)

Kid scene currently renders mocks. Replace the mock render path for the production scene (not the dev scene-picker) to call `markTaskComplete` on tap.

- [ ] **Step 1:** find the tap handler in the real kid flow.
- [ ] **Step 2:** call `markTaskComplete(task.id, child.id)` inside. Optimistically update local completions; rely on realtime echo for cross-device sync.
- [ ] **Step 3: Manual smoke** — tap tile → celebration → row checked → verify insert in Supabase.
- [ ] **Step 4: Commit** — `feat(kid): tap-to-complete writes as parent`.

---

## Task 9 — Parent PIN management screen

**Files:**
- Create: `app/(parent)/pin-settings.tsx`
- Modify: `app/(parent)/settings.tsx` — link the "Kid-view PIN" row to push `/(parent)/pin-settings`.

Three actions: Set (no PIN yet), Change (prompt for current PIN, then new+confirm), Remove (prompt for current PIN, then `clearPin()`).

- [ ] **Step 1:** scaffold the screen with conditional UI based on `hasPin()`.
- [ ] **Step 2:** wire Change flow reusing `create-pin` / `confirm-pin` via params.
- [ ] **Step 3:** wire Remove with current-PIN confirmation.
- [ ] **Step 4: Manual smoke** each path.
- [ ] **Step 5: Commit** — `feat(parent): PIN management in settings`.

---

## Task 10 — Persist-kid-view on relaunch

**Files:**
- Modify: `app/_layout.tsx`

If `mode === 'kid'`, route to `/(kid)/display` at boot regardless of previous segment. Replace the old first-launch/pairing branches.

- [ ] **Step 1:** update routing effect.
- [ ] **Step 2: Manual smoke** — enter kid view, kill app, reopen → lands in kid view.
- [ ] **Step 3: Commit** — `fix(routing): persist kid view across relaunch`.

---

## Task 11 — First-launch simplified

**Files:**
- Modify: `app/(first-launch)/index.tsx` (remove mode chooser; just redirect to `parent-auth` if no session; otherwise `parent-onboarding`).
- Delete: `app/(first-launch)/parent-auth.tsx` is kept; it's the chooser entry we simplify.
- Delete: any pair-device screens in `(first-launch)` if present.

- [ ] **Step 1:** edit `(first-launch)/index.tsx`.
- [ ] **Step 2:** confirm `app/_layout.tsx` routes non-authed users here.
- [ ] **Step 3: Manual smoke.**
- [ ] **Step 4: Commit** — `feat(onboarding): single first-launch path`.

---

## Task 12 — Delete pairing from the client

**Files:**
- Delete: `app/(kid)/pair*` (if any), `src/ui/PairCode*.tsx`, `src/ui/CodeEntry.tsx`, `src/ui/kid/scenes/PrePairScene.tsx`, `src/lib/server.ts`.
- Modify: `src/lib/supabase.ts` — delete `getKidClient()`. Re-point any callers.
- Modify: `src/lib/secureStore.ts` — delete kid-token helpers.
- Modify: `src/ui/index.ts` — drop removed exports.
- Modify: `src/hooks/useKidScreenState.ts` — remove kid-token path; use parent client.
- Modify: `app/(kid)/_layout.tsx` — require parent session.
- Modify: `package.json` — remove `"server"` / `"server:dev"` scripts and `EXPO_PUBLIC_SERVER_URL` references.
- Delete: `server/` directory.

- [ ] **Step 1: Delete client paths.**
- [ ] **Step 2: Fix compile errors** (TypeScript will guide you).
- [ ] **Step 3:** run `grep -r "kid_device\|pairing_code\|getKidClient\|EXPO_PUBLIC_SERVER_URL" app/ src/` — should return zero.
- [ ] **Step 4: Run tests.**
- [ ] **Step 5: Commit** — `refactor: remove kid-device pairing subsystem from client`.

---

## Task 13 — Supabase migration to drop pairing

**Files:**
- Create: `supabase/migrations/0006_drop_pairing.sql`

Drop in this order: RLS policies on `kid_devices`, the pairing RPC function(s), the `kid_devices` table. Use `IF EXISTS` to stay idempotent on already-cleaned DBs.

- [ ] **Step 1: Write migration.**
- [ ] **Step 2: Apply to local.** `supabase db reset` or equivalent.
- [ ] **Step 3: Commit** — `feat(db): drop kid-device pairing schema`.

---

## Task 14 — Wiki updates

**Files:**
- Delete: `wiki/concepts/pairing-flow.md`, `wiki/entities/tables/kid_devices.md`, `wiki/entities/servers/server.md`.
- Modify: `wiki/synthesis/architecture.md`, `wiki/synthesis/security-model.md`, `wiki/synthesis/v1-scope.md`, `wiki/concepts/kid-screen-states.md`, `wiki/index.md`.
- Modify: `wiki/log.md` — append log entry.

Follow the bullets in `docs/superpowers/specs/2026-05-10-flexible-device-roles-design.md` §"Wiki touches".

- [ ] **Step 1: Apply edits.**
- [ ] **Step 2: Commit** — `docs(wiki): drop pairing pages; update invariants for flexible roles`.

---

## Task 15 — Regression sweep

- [ ] **Step 1:** full `npx vitest run` — all green.
- [ ] **Step 2:** manual smokes per spec §Testing.
- [ ] **Step 3:** grep check (Task 12 Step 3).
- [ ] **Step 4:** commit any follow-up fixes, one commit each.

---

## Self-review notes

- Spec §Scope-In: all covered (Tasks 1–13). §Scope-Out: untouched.
- Spec §Invariant changes: wired into Task 14.
- No TBDs. Code snippets shown where non-obvious; trivial UI scaffolding (Tasks 5–9) described by behavior + Figma frame reference, consistent with "don't write too much low-level code."
- Types: `setPin`, `verifyPin`, `hasPin`, `clearPin` (existing) + new `recordFailure`, `clearFailures`, `lockoutMsRemaining` in Task 1 are referenced consistently in Tasks 5/6/9.
- Sequencing: data-layer (1–3) → UI (4–9) → app-level routing (10–11) → deletes (12–13) → docs (14) → sweep (15). Each task is independently committable.
