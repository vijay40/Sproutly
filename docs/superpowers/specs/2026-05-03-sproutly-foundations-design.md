# Sproutly — Foundations Design

**Date:** 2026-05-03
**Scope:** Architectural foundations + V1 build sequence. Each ⭐ milestone gets its own focused spec when we reach it.
**Status:** Draft for review

---

## 1. Product summary

Sproutly is a mobile app for parents of 5-9 year olds that uses a gamified unicorn avatar to build daily routines. The child has no phone and watches a shared family iPad that is always on and locked to the app. The parent controls everything from their phone. The unicorn grows through five stages as the child completes tasks over 30 days. The system is engineered for early wins — confidence before challenge.

See `../../../` project root for the product brief this design derives from.

---

## 2. Architecture

**One Expo (React Native) app, two device roles, one Supabase backend.**

```
┌──────────────────┐        ┌────────────────────────┐        ┌──────────────────┐
│  Parent phone    │        │       Supabase         │        │    Kid iPad      │
│  (parent mode)   │──────▶│  Postgres + Auth +     │◀──────│  (kid mode)      │
│                  │        │  Realtime + Edge Fns   │        │                  │
│  full CRUD,      │        │                        │        │  read-only view, │
│  marks tasks done│        │  RLS enforces role     │        │  animates on     │
└──────────────────┘        └────────────────────────┘        │  realtime insert │
        ▲                              │                       └──────────────────┘
        │                              ▼
        │                    ┌────────────────────┐
        └─── parent-         │  Claude API        │
             triggered ─────▶│  (insight gen,     │
             edge fn         │   rate-limited)    │
                             └────────────────────┘
```

Key properties:

- **Single codebase, role fixed at first-launch pairing.** A local mode flag persists `parent | kid`. From then on the app boots straight into that role's screen tree. First-launch chooser asks *"Parent or Kid iPad?"* Switching modes requires a clean reinstall or explicit "reset this device" action.
- **Parent auth** is Supabase magic-link email only in V1. Google + Apple sign-in are deferred to week 11 for App Store readiness.
- **Kid iPad never logs in as a user.** The parent generates a 6-digit pairing code in-app. The iPad enters it; the server mints a long-lived, scoped JWT device token stored in iOS Keychain (Expo SecureStore).
- **Realtime** is the sync backbone. Parent inserts a `task_completions` row; iPad's subscription fires and the celebration animation plays.
- **Offline-tolerant kid screen.** Today's tasks and avatar state are cached in AsyncStorage; the iPad continues to render its current state if the network drops. Completions queued on the parent phone replay on reconnect.
- **AI insights are parent-triggered, not scheduled.** When the parent opens the app and the last insight is >20h old, the app calls an edge function that generates a new insight. A server-side rate limit caps one generation per family per 20-hour window.

### Device modes

| Mode | Booted on | Can do |
|------|-----------|--------|
| Parent | Phone | Full CRUD, mark tasks done, view heatmap, apply/dismiss insights, generate pairing code |
| Kid | iPad | Render unicorn, render tasks, receive realtime completions, play animations |
| Unpaired | Any device pre-setup | First-launch mode chooser; no data access |

---

## 3. Data model

All timestamps are `timestamptz`. All IDs are `uuid` unless otherwise specified. All FKs use `on delete cascade` to support account deletion.

```sql
families (
  id uuid primary key,
  parent_user_id uuid references auth.users,
  timezone text not null,                     -- IANA, e.g. 'Asia/Kolkata'
  created_at timestamptz default now()
)

children (
  id uuid primary key,
  family_id uuid references families on delete cascade,
  name text not null,
  age int,
  avatar_stage int default 1,                 -- 1..5
  successful_days int default 0,
  last_evaluated_date date,                   -- last day-roll processed (family-local)
  pending_stage_transition boolean default false,
  cosmetics jsonb default '[]'::jsonb,        -- unlocked cosmetic ids
  equipped_cosmetics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
)

tasks (
  id uuid primary key,
  child_id uuid references children on delete cascade,
  title text not null,
  icon text,
  category text check (category in ('routine','chore','behavior')),
  time_slot text check (time_slot in ('morning','afternoon','evening')),
  difficulty int default 1 check (difficulty between 1 and 3),
  recurrence text check (recurrence in ('daily','weekdays','custom','one_time')),
  recurrence_days int[],                      -- 0..6, when recurrence='custom'
  is_bonus boolean default false,
  bonus_cosmetic_id text references cosmetics(id),
  is_active boolean default true,
  created_at timestamptz default now()
)

task_completions (
  id uuid primary key,
  task_id uuid references tasks on delete cascade,
  child_id uuid references children on delete cascade,
  local_date date not null,                   -- family-timezone date this counts for
  completed_at timestamptz default now(),
  marked_by_parent boolean default true,
  unique (task_id, local_date)                -- prevents double-complete for recurring tasks
)

daily_summaries (
  child_id uuid references children on delete cascade,
  local_date date not null,
  total_tasks int not null,                   -- scheduled for that date (excluding bonus)
  completed_tasks int not null,
  was_successful boolean not null,            -- completed/total >= 0.6
  simplified_from_miss boolean default false, -- parent applied simplify flow for this date
  primary key (child_id, local_date)
)

ai_insights (
  id uuid primary key,
  family_id uuid references families on delete cascade,
  insight_text text not null,
  suggestion_type text,                       -- see enum below
  task_id uuid references tasks,              -- nullable
  is_applied boolean default false,
  is_dismissed boolean default false,
  generated_at timestamptz default now(),
  passed_safety_filter boolean not null
)

ai_generation_log (
  id uuid primary key,
  family_id uuid references families on delete cascade,
  requested_at timestamptz default now(),
  succeeded boolean,
  input_tokens int,
  output_tokens int
)
-- index: (family_id, requested_at desc)

kid_devices (
  id uuid primary key,
  family_id uuid references families on delete cascade,
  child_id uuid references children on delete cascade,
  device_token_hash text,                     -- null until successful redeem
  pairing_code text,                          -- null outside the 10-min pairing window
  pairing_code_expires_at timestamptz,
  pairing_attempts int default 0,             -- brute-force guard
  paired_at timestamptz,
  last_seen_at timestamptz,
  device_label text,
  check (
    (device_token_hash is not null) or
    (pairing_code is not null and pairing_code_expires_at is not null)
  )
)

cosmetics (
  id text primary key,                        -- e.g. 'horn_gold'
  name text,
  type text check (type in ('horn','mane','background')),
  asset_path text
)
```

**`suggestion_type` enum values:** `difficulty_up | difficulty_down | reschedule | break_task | simplify_tomorrow | generic`

**V1 constraint:** exactly one child per family. Schema supports many but UI and flows assume one.

**Derived values, not stored:**
- Current "state" of the kid screen (see Section 5) is a pure function of today's tasks, today's completions, the child row, and network status.
- Today's list of tasks is derived from `tasks` + `recurrence` + today's weekday in family timezone.

---

## 4. Key flows

### 4.1 Kid iPad pairing

1. On parent phone, tap "Pair iPad" → app calls an RPC that creates/updates a `kid_devices` row with a random 6-digit `pairing_code` and `pairing_code_expires_at = now() + 10 minutes`.
2. Phone displays the code.
3. On the iPad, first-launch chooser → "Kid iPad" → prompts for code.
4. iPad POSTs code to `/functions/redeem-pairing-code` (edge function using service role).
5. Edge function validates code + TTL, mints a signed JWT with claim `kid_device_id`, hashes and stores the token in `device_token_hash`, clears the pairing code, sets `paired_at = now()`.
6. iPad stores the token in iOS Keychain via Expo SecureStore, writes local mode flag = `kid`, boots the kid screen tree.

**Brute-force protection:** max 5 redeem attempts per code before the code is invalidated. Codes expire after 10 min regardless.

**Revocation:** parent's "Remove iPad" action deletes the row. The next request from that iPad fails RLS and the iPad shows the first-launch chooser again.

### 4.2 Mark task done (end to end)

1. Parent taps "Mark Done" on phone. UI optimistically shows ✓.
2. Client INSERTs a `task_completions` row with `local_date = today in family timezone`.
3. Supabase Realtime broadcasts the INSERT.
4. Kid iPad's subscription handler:
   - Plays celebration Lottie (state 2 — see Section 5).
   - Updates progress bar based on new completion count / today's total tasks.
   - Does **not** change avatar stage. Stage transitions happen only at day-roll.

### 4.3 Day-roll + stage progression

Day-roll is **lazy-triggered** on app open. No cron.

On every app open (parent or kid), the client requests today's data through a helper that first runs:

```
if child.last_evaluated_date < yesterday_local:
  for each missing date in (last_evaluated_date, yesterday_local]:
    run day_roll(child, date)
```

`day_roll(child, date)`:

1. Compute `total_tasks` = count of tasks scheduled for `date` honoring recurrence (not counting bonus tasks, not counting inactive tasks).
2. Compute `completed_tasks` = count of `task_completions` for this child with `local_date = date`.
3. `was_successful = (total_tasks > 0) AND (completed_tasks / total_tasks >= 0.6)`.
4. Upsert a `daily_summaries` row.
5. If `was_successful`: increment `children.successful_days`. Check stage thresholds (7 → stage 2, 14 → 3, 21 → 4, 30 → 5). If crossed, update `children.avatar_stage = new_stage` AND set `children.pending_stage_transition = true` in the same write.
6. If NOT `was_successful`: create a draft `ai_insights` row with `suggestion_type = simplify_tomorrow` referencing the worst-performing time slot. It will be surfaced to the parent in the next insight card.
7. Set `children.last_evaluated_date = date`.

Idempotent — safe to run on every open.

### 4.4 Miss → simplify tomorrow

The only "consequence" of a missed day is a parent-facing prompt, never a kid-facing punishment.

- Triggered by a `simplify_tomorrow` draft insight created during day-roll.
- Surfaced to parent as an insight card: *"Priya missed 2 tasks yesterday. Want to show just her top 1 task this morning to rebuild momentum?"* with **Apply** and **Dismiss**.
- **Apply:** server sets `daily_summaries.simplified_from_miss = true` for today. The kid screen derives its simplified state from this flag plus a mechanism defined in the ⭐ AI insights spec (candidate approaches: a `hidden_until_other_complete` flag on today's derived task view; a priority score on tasks; or reuse of `difficulty`). Exact mechanism, including which task is "top task" and when hidden tasks reappear, is deferred.
- **Dismiss:** normal day proceeds.

The kid screen never indicates that a day is simplified. From the child's perspective, it is just today.

### 4.5 Tonight promise + morning evolution

When the last scheduled task of a day is completed AND that completion makes today a successful day AND `successful_days + 1` crosses a stage threshold:

- The kid screen enters **state 4 — Tonight promise** for the rest of the evening: special glowing/swirling ambient animation, on-screen message *"Something magical happens tomorrow ✨"*, progress bar full and pulsing.
- This is a **derived client-side state**. No DB write required. The iPad has today's completions, today's total, and `successful_days` — it can compute "would tonight's success cross a threshold?"

When the iPad first renders after day-roll on the following day and `pending_stage_transition = true`:

- The iPad reads the **previous** stage from a small client-side cache (last known rendered stage) to animate the morph, and the **new** stage from `children.avatar_stage` (already written by day-roll).
- **State 5 — Morning evolution** plays the large transformation Lottie (previous stage → new stage).
- After the animation, the client updates its local cached stage to the new one. Clearing `pending_stage_transition = false` is done by the **parent app** next time it opens (it is the only writer), or by an RPC the iPad calls that is whitelisted specifically for this flag. The V1 approach: parent app clears the flag opportunistically; if the parent does not open the app for days, the flag stays `true` but the animation only plays once (the iPad caches "transition played for stage N"). This keeps the kid token SELECT-only.

---

## 5. Kid screen states

The kid screen is a pure state machine derived from `(today's tasks, today's completions, children row, pending_stage_transition, network status)`. No `kid_screen_state` column.

| # | State | Enters when | What the kid sees |
|---|-------|------|-------------------|
| 1 | Idle — tasks pending | Tasks exist, not all complete | Calm idle unicorn. Task icons with neutral "not done" styling. Progress bar shows today's fill so far. |
| 2 | Celebration | Realtime INSERT fires | Full-screen Lottie burst + sound. Returns to underlying state after ~2s. |
| 3 | All done for today | All of today's scheduled tasks complete, not a transition day | Happy/proud idle loop. Message: *"All done for today! Great job."* Progress bar full. |
| 4 | Tonight promise | Today complete AND successful AND would cross a stage threshold | Glowing/swirling ambient animation. Message: *"Something magical happens tomorrow ✨"* Progress bar pulsing. |
| 5 | Morning evolution | First render after day-roll with `pending_stage_transition = true` | Big transformation Lottie current-stage → new-stage. Then falls into state 1. |
| 6 | Simplified day | Parent applied simplify-tomorrow for today | Same as state 1 with fewer visible tasks. No indication that it is simplified. |
| 7 | Bonus unlocked | Bonus task just completed | Cosmetic reveal animation, auto-equip, then state 1. |
| 8 | Offline | Network lost, cached data fresh | Identical to state 1 from cache. Tiny adult-only corner indicator. |
| 9 | First launch pre-pair | No device token in Keychain | Pairing code entry screen. Only state with interactive UI. |

**Deliberately absent:** no "you missed a task" state, no "streak broken" state, no sad/angry/sick unicorn, no "connection lost, can't help you" state, no "pay to continue" state. The only interactive state is 9 (pairing).

---

## 6. Security & privacy

### Row-Level Security

Every table with `family_id` or reachable via `family_id` has RLS on.

- **Parent policy:** JWT carries `auth.uid()`. Policies require the row's family to have `parent_user_id = auth.uid()`.
- **Kid device policy:** the kid token is a separate JWT with custom claim `kid_device_id` (no `auth.uid`). SELECT-only policies join through `kid_devices` to enforce that the device is paired to that child. No INSERT/UPDATE/DELETE policies grant the kid token anything.
- **Kid token cannot touch:** `families`, `ai_insights`, `ai_generation_log`, `kid_devices` (other rows), parent auth tables.
- **Kid token can read:** its own `children` row, that child's `tasks`, `task_completions`, `daily_summaries`, and the public `cosmetics` catalog.

### Secrets and tokens

- Kid device token: stored in iOS Keychain via Expo SecureStore. Server stores only the hash.
- Anthropic API key: edge function environment variable only. Never in the mobile bundle.
- Supabase service role key: edge function only. Never in the mobile bundle.
- Pairing code: 6 digits, single-use, 10-min TTL, cleared on redeem. Max 5 attempts per code.

### AI pseudonymization and safety (V1)

Sent to Anthropic per insight generation:

- Child's **first name replaced with placeholder `{{CHILD_NAME}}`** before the call; substituted back to the real name after the filtered response is received.
- Age, current avatar stage.
- Per-task completion percentages for the last 7 days, bucketed by time slot.

**Never sent:** parent email, full name, photos, device identifiers, location, `family_id`, timestamps in a form that could identify household schedule patterns beyond the morning/afternoon/evening buckets.

**System prompt** instructs Claude to: refer to the child only as `{{CHILD_NAME}}`; never speculate about clinical conditions, diagnoses, or family circumstances; keep tone warm, specific, actionable; produce one insight under 2 sentences.

**Post-generation safety filter:** keyword/phrase rejection list covering judging framings (e.g., "lazy," "bad," "failure," "disorder," "should be able to"). On rejection, a generic fallback ("Keep building the routine this week — consistency is what grows the unicorn.") is stored and `passed_safety_filter = false` is flagged for audit.

**Rate limiting:** server-enforced in the edge function — max one generation per family per 20-hour window. Rate check uses `ai_generation_log`. Repeat calls return the most recent insight for that family.

### Data retention

- `task_completions`: retained indefinitely.
- `daily_summaries`: retained indefinitely.
- `ai_generation_log`: retained 90 days, then purged.
- `ai_insights`: retained indefinitely.
- Account delete: parent-initiated; cascades via `on delete cascade` in the schema.

### Explicit V1 non-goals

- Formal parental consent / COPPA flow. Flag for App Store review time — the app does not collect data from the child (no child account, no child input), so this is plausibly out of scope, but it is not a determination made in this spec.
- End-to-end encryption.
- Audit log of parent actions.

---

## 7. Offline behavior (kid iPad)

- On every successful load, the iPad writes to AsyncStorage: today's task list, today's completions, `children` row snapshot. Keyed by local date.
- If the network drops, the app continues to render state 1 / 3 / 4 / 6 / 7 / 8 from cache.
- A tiny adult-visible corner dot indicates offline status. Never shown to the child as a "problem."
- On reconnect, the app fetches today's `task_completions` since the last cached `completed_at`. Any new completions trigger the celebration animation in sequence (quick-fire, not one at a time over seconds).
- If the date has rolled while offline, the day-roll runs on reconnect.

The parent phone uses Supabase's client-side queue for INSERTs during brief disconnects. A long parent-side outage is out of scope for V1.

---

## 8. AI insight pipeline (parent-triggered)

On parent app open, if the most recent `ai_insights` row for this family is older than 20 hours (or none exists), the client calls edge function `generate-insight`:

1. Edge function queries `ai_generation_log` for this family in the last 20h. If ≥1 succeeded row, return the latest existing insight. Else proceed.
2. Pull last 7 days of `task_completions` + `daily_summaries` + relevant tasks.
3. Compute stats: per-task completion %, per-time-slot completion %, streak direction.
4. Build the Claude prompt with `{{CHILD_NAME}}` placeholder + age + stage + stats.
5. Call `claude-sonnet-4-6` (or current default) with `max_tokens = 300`.
6. Log the call in `ai_generation_log` (tokens, success).
7. Run safety filter. On reject: store generic fallback.
8. Substitute `{{CHILD_NAME}}` back to the real name in the final `insight_text`.
9. Insert `ai_insights` row.
10. Return the insight to the client.

If day-roll produced a draft `simplify_tomorrow` insight overnight, the edge function prefers surfacing that draft over generating a fresh one — drafts are promoted to real insights without a new Claude call.

---

## 9. Asset strategy

- **Characters (stages 1-5) + cosmetics:** AI-generated PNGs, curated and touched up for consistency. ~1 hero reference image defines the style; all variants are image-to-image or reference-mode generations.
- **Animation:**
  - Idle (per stage): Reanimated-driven scale/bounce on a static PNG. No per-stage custom animation file.
  - Celebration (state 2): free/purchased Lottie burst + sparkle overlay composited on top of the static unicorn PNG.
  - Tonight promise (state 4): Reanimated glow + rotation + particle overlay on top of the static stage PNG.
  - Morning evolution (state 5): a per-transition Lottie or composite crossfade (current-stage PNG → new-stage PNG) with particle overlay. Four transitions needed (1→2, 2→3, 3→4, 4→5).
- **Cosmetic reveal (state 7):** single reusable Lottie "item flies in + glow" wrapping the cosmetic PNG.

Full art direction lives in the ⭐ avatar-animation and ⭐ cosmetics specs.

---

## 10. Project structure (initial)

```
sproutly/
  app/                          # Expo Router routes
    _layout.tsx                 # chooses mode tree based on local flag
    (first-launch)/             # mode chooser + pairing
    (parent)/                   # parent mode screens
    (kid)/                      # kid mode screens
  src/
    lib/
      supabase.ts               # client with appropriate token
      realtime.ts               # subscriptions
      time.ts                   # timezone-aware date helpers
      cache.ts                  # AsyncStorage wrappers
    domain/
      tasks.ts                  # recurrence expansion, today derivation
      dayRoll.ts                # lazy day-roll logic
      kidScreenState.ts         # pure state derivation
    ui/                         # shared components
      parent/
      kid/
  supabase/
    migrations/                 # schema
    functions/
      redeem-pairing-code/
      generate-insight/
  docs/
    superpowers/specs/          # this spec + future milestone specs
```

Keeping `domain/` pure (no IO) lets the state machine and day-roll be unit-tested without a Supabase connection.

---

## 11. Milestone plan

Weeks 1-12 at ~10 hrs/week. ⭐ denotes its own focused design spec written just before that week.

| Wk | Milestone | Deliverable | Spec shape |
|----|-----------|-------------|-----------|
| 1 | Foundations | Expo app scaffolded. Supabase project + schema migrated. Magic-link auth works end to end. | this spec |
| 2 | Mode selection + pairing | First-launch chooser. Parent onboarding (timezone, child name, age). Pairing code flow end to end. Mode flag persisted. | this spec |
| 3 | Parent task CRUD | Today's tasks list, add/edit/delete with category, time slot, difficulty, recurrence. Minimal styling. | this spec |
| 4 | Kid screen static states | States 1 and 3 render from live data with stage-1 PNG. No animations yet. | ⭐ kid-screen-v1 |
| 5 | Mark-task-done + realtime | INSERT path with correct `local_date`. Realtime subscription updates progress bar. | this spec |
| 6 | Celebration + Reanimated motion | State 2 celebration. Idle breathing. Stages 1-5 PNGs imported. | ⭐ avatar-animation |
| 7 | Day-roll + stage progression | Lazy day-roll. `daily_summaries`. `successful_days`. Stage transitions. States 4 and 5. | ⭐ day-roll-and-stages |
| 8 | Offline cache + resilience | AsyncStorage cache. State 8 offline mode. Completion replay on reconnect. | ⭐ offline-resilience |
| 9 | Bonus tasks → cosmetics | `is_bonus` + `bonus_cosmetic_id` wired through. State 7 reveal. Cosmetic rendering on unicorn. | ⭐ cosmetics |
| 10 | AI insights + simplify-tomorrow | Edge function. Pseudonymization. Safety filter. Rate limit. Insight card UI. State 6 simplified day. | ⭐ ai-insights |
| 11 | Polish + Google/Apple sign-in | Loading/error states, heatmap, Remove iPad, Google + Apple sign-in for App Store. | ⭐ polish |
| 12 | TestFlight cut | Icon, splash, App Store Connect setup, TestFlight build, invite list. | — |

**Critical path:** week 7 depends on week 5 (completions with correct `local_date`) and week 2 (timezone captured). Week 10 is the only week that needs a second edge function deployed. Weeks 1–9 are client + direct Supabase.

**Risk budget:** weeks 10 and 11 consistently overrun; weeks 1–9 should be protected from scope creep to leave runway.

---

## 12. Explicit V1 non-goals

Pulled from the brief and reaffirmed:

- Multiple children per family.
- Consequence / avatar degradation mechanics (no sad/angry/sick unicorn).
- Parent AI chat interface.
- Social sharing.
- Allowance / points / money.
- Push notifications to the child.
- Detailed analytics dashboard beyond the weekly heatmap.
- Android support.
- Paywall implementation (free/premium feature split is designed but not built).

---

## 13. Open questions deferred to milestone specs

- Exact algorithm for "top task to keep" in simplify-tomorrow (⭐ ai-insights).
- Exact transition Lottie composition for each stage pair (⭐ avatar-animation).
- Heatmap visual design and interactive behavior (⭐ polish).
- Cosmetic slot model — horn/mane/background simultaneity rules (⭐ cosmetics).
- Exact network-loss thresholds and retry/backoff on the iPad (⭐ offline-resilience).
