# Flexible Device Roles — Design

**Date:** 2026-05-10
**Status:** Approved for planning
**Supersedes:** the two-device role model in `2026-05-03-sproutly-foundations-design.md` §device-modes and §pairing-flow

## Problem

Today the product requires two physical devices: a parent phone for writes and a kid iPad for display. Families without both (one phone only, one iPad only, or two phones) can't use the app. This caps the addressable audience significantly.

## Goal

One app, one authenticated principal, two UI modes. Any device — phone or iPad — can host parent UI, kid UI, or both. Role decouples from device.

## Scope

### In scope

- Single first-launch path: parent magic-link sign-in.
- "Enter kid view" toggle available on any signed-in device.
- 4-digit PIN gates exit from kid view. Optional; parent sets during onboarding or later in settings.
- Phone-sized kid view (new `<600px` small breakpoint) in addition to existing iPad layouts.
- Kid-view tap writes `task_completions` under the parent session (kid view is UI chrome, not a security boundary).
- Mode flag persisted so closing the app in kid view reopens in kid view.
- "Forgot PIN" recovery via parent magic-link re-auth.
- Deletion of the kid-iPad pairing subsystem end-to-end (table, RPC, RLS, JWT signing, Node server, client token paths, UI).
- Kid-view data access via the REST API. `useKidScreenState` rewrites reads to `api.me.get()` / `api.children.list()` / `api.tasks.list(...)` / `api.taskCompletions.list(...)` and triggers `api.dayRoll.run({})` on foreground. The Supabase SDK Realtime subscription to `task_completions` INSERTs stays.

### Out of scope

- Multi-child support (remains V1 out-of-scope).
- Android.
- Biometric PIN unlock (PIN only in V1).
- PIN sync across devices (one PIN per install).
- Scoped "view-as-kid" JWTs (kid view runs on the parent JWT).
- Backfill of any existing TestFlight users — product is pre-ship, no real users to migrate.

### Invariant changes

Two invariants in `wiki/synthesis/v1-scope.md` change:

- **#1 "Parent controls everything — the child is a viewer, never a user"** — softened to: *parent is the only authenticated principal; kid view is a UI affordance the parent enables. The kid's tap in kid view writes a `task_completion` under the parent session.*
- **#7 "Kid device token is SELECT-only"** — **removed**. No kid token exists after this change.

## Architecture

```
┌──────────────────────────────────────┐
│  Sproutly app (phone or iPad)        │
│                                      │
│  First-launch: magic-link sign-in    │
│                                      │
│  After sign-in:                      │
│   ├── Parent UI (default)            │
│   │     └─ "Enter kid view" button   │
│   │                                  │
│   └── Kid UI (mode flag = 'kid')     │
│         └─ Exit requires PIN         │
│                                      │
│  All data reads/writes: REST server  │
│  (parent JWT forwarded).             │
│  Realtime subscription: Supabase SDK.│
└──────────────────────────────────────┘
```

### Routing (`app/`)

- `app/(first-launch)/` — collapses to a single magic-link screen. Role chooser and kid-iPad branch deleted. Post sign-in routes to `(parent)`.
- `app/(parent)/` — gains a "View as Kid" entry point that sets mode flag and navigates to `(kid)`.
- `app/(kid)/` — route group stays. `_layout.tsx` auth gate replaced with "require parent session; if none, route to magic-link." Existing `__DEV__` bypass to `/display` stays for dev.
- Pair screens (`PrePairScene` and entry tile) deleted.

### Modules

| Module | Change |
|---|---|
| `src/lib/mode.ts` | Repurposed from first-launch role flag to session-level mode flag. Persisted in SecureStore. Setters: `enterKidView()`, `exitKidView(pin)`. |
| `src/lib/kidLock.ts` | **New.** `setPin`, `verifyPin`, `hasPin`, `clearPin`. Hash = sha256 + per-install salt. Attempt counter + lockout timestamp persisted in SecureStore. |
| `src/lib/supabase.ts` | `getKidClient()` **deleted**. All call sites re-point to `getParentClient()`. |
| `src/lib/secureStore.ts` | Kid-token helpers (`getKidToken`/`setKidToken`/`clearKidToken`) deleted. PIN helpers added. |
| `src/lib/server.ts` | **Deleted** (obsolete pairing endpoint client). |
| Kid scenes | Add `small` (<600) breakpoint: single column, reduced avatar (~180px), stacked layout. Confetti/progress/streak/task row already take width props; smaller defaults at small breakpoint. No new Figma frames — existing iPad K-frames are the reference; implementation adapts them to phone widths. |
| `src/hooks/useKidScreenState.ts` | Rewrite reads to `api.*` wrappers (me, children, tasks, task-completions). Trigger `api.dayRoll.run({})` on foreground before reads. Realtime subscription stays on Supabase SDK via `getParentClient()`. |

### PIN pad UX

- 4 digits, tap-to-enter, "forgot PIN" link.
- Wrong PIN: shake + attempt counter increment.
- 3 wrong in a row → 30s lockout. Lockout timestamp persists across app restarts.
- "Forgot PIN" → parent magic-link re-auth → PIN cleared.

### Kid-view entry / exit

- **Enter:** tap "View as Kid" → no PIN required → mode flag set → route to `/(kid)/display`.
- **Exit:** low-discoverability corner affordance (not hidden, just not inviting) → PIN pad → correct → mode cleared → route to parent home. No PIN configured → confirm dialog only.

### Realtime

Subscription to `task_completions` INSERTs now runs under the parent session. No code changes beyond the client swap. For single-device setups, kid tap → insert → local celebration (optimistic) and realtime echo both fire; dedupe handled by the existing reducer.

### Schema / RLS

- New migration `0006_drop_pairing.sql`:
  - Drops `kid_devices` table.
  - Drops RLS policies from `0004_rls_kid_device.sql`.
  - Drops the pairing RPC from `0003_pairing_rpc.sql`.
- Parent RLS (`0002_rls_parent.sql`) unchanged.
- Older migrations left in place as history; forward migration tears down what they built.

### Server

The old pairing server (repo-root `server/`) was deleted when REST Phase A shipped. What remains here: remove the client shim `src/lib/server.ts` and the `EXPO_PUBLIC_SERVER_URL` env. The new `packages/server/` REST server is unrelated and stays.

## User flows

**A — New user first launch.** Magic link → onboard child (name/age/avatar) → optional PIN setup → parent home.

**B — Enter kid view.** Parent taps "View as Kid" → mode flips → `/(kid)/display`.

**C — Exit kid view.** Tap exit → PIN pad (if PIN set) → correct → parent home. Wrong 3x → 30s lockout.

**D — Kid marks task done.** Kid taps tile → `api.taskCompletions.create({ task_id, child_id })` under parent session → celebration → task checked.

**E — Relaunch in kid view.** Mode flag persisted → opens straight to kid view. No parent UI flash.

**F — Parent manages PIN.** Parent settings → set/change/remove PIN. Remove requires current PIN.

**G — Forgot PIN.** Exit pad "Forgot PIN?" → magic-link re-auth → PIN cleared.

## Edge cases

| Case | Behavior |
|---|---|
| No parent session at app open | Ignore mode flag; route to magic-link. |
| Session expires in kid view | Cached reads keep rendering. Next write retries refresh; on hard fail, existing offline chrome. |
| Two devices, same family | Each device has its own mode flag and own PIN. |
| Realtime disconnected when kid taps | Write still succeeds; celebration fires from optimistic update. |
| PIN lockout across restarts | Lockout timestamp persists in SecureStore. |
| "View as Kid" with no child set up | Show "Set up your child first" state linking back to onboarding. |
| Rotate in kid view | Existing responsive layouts; new small breakpoint handles phone. |

## Deliberate non-goals

- Biometric unlock.
- Multiple or per-parent PINs.
- PIN sync across devices.
- Invisible exit affordance (low-discoverability is the bar; the PIN is the gate).
- Session downgrade / scoped view-as-kid tokens.

## Testing

### Unit (Vitest)

- `kidLock.ts` — PIN hash determinism, verify correct/wrong, rate-limit counter, lockout timestamp math.
- `mode.ts` — setters/getters, persistence, default.
- `useKidScreenState` — mocked `api.*` reads; foreground triggers `api.dayRoll.run({})`; realtime channel wires via parent client.
- `kidScreenState.test.ts` — update to remove any kid-token-era inputs.

### Manual smoke (post-migration)

1. Fresh install → magic-link → onboard → parent home.
2. View as Kid → kid scenes → tap task → celebration → checked in parent too.
3. Exit → wrong PIN 3x → lockout → wait → correct → exit.
4. Kill app in kid view → reopen → lands in kid view.
5. Second device, same email → independent mode flags, shared data.
6. Phone portrait → small layout renders without overflow.
7. Forgot PIN → magic-link re-auth → PIN cleared.
8. Network off → kid tap → optimistic celebration → syncs on reconnect.

### Pre-deploy checks

- `0006_drop_pairing.sql` applies cleanly on reset DB.
- `grep -r "kid_device\|pairing_code\|getKidClient\|EXPO_PUBLIC_SERVER_URL\|markTaskComplete" app/ src/` returns zero (Realtime `supabase.channel(...)` in `useKidScreenState.ts` is expected).
- `src/lib/server.ts` deleted; `EXPO_PUBLIC_SERVER_URL` removed from `.env.example`. Repo-root `server/` already gone from REST Phase A. `packages/server/` unaffected.

## Risks

- **Server-side validation lives in the REST server.** The repo-root pairing `server/` was deleted when REST Phase A shipped; `packages/server/` now hosts all server-side rules and is the enforcement layer alongside parent RLS.
- **Parent forgets to set PIN.** Curious kid could toggle back to parent UI. Mitigation: PIN prompt in initial onboarding; opt-out requires an explicit tap.
- **Pre-ship cleanup.** This spec assumes no real users on the pairing flow today. If that's wrong, migration plan needs to change.

## Wiki touches (in the same change as code)

Delete:
- `wiki/concepts/pairing-flow.md`
- `wiki/entities/tables/kid_devices.md`
- `wiki/entities/servers/server.md`

Update:
- `wiki/synthesis/architecture.md` — remove two-role device split, remove server block, update auth-model paragraph.
- `wiki/synthesis/security-model.md` — remove kid-device JWT row, remove pairing-code row, remove kid RLS summary, update token table.
- `wiki/synthesis/v1-scope.md` — update invariant #1 wording; remove invariant #7; add drift-log entry for role model change.
- `wiki/concepts/kid-screen-states.md` — drop any pairing/kid-token references.
- `wiki/index.md` — remove deleted pages.

Log entry: `## [2026-05-10] remove | delete kid-device pairing subsystem, role decouples from device`.
