# Sproutly — Agent Operating Rules

This repo uses a Karpathy-style LLM wiki as the primary context layer. The wiki (`wiki/`) is a persistent, compounding artifact the agent maintains alongside the code. It is NOT generated from code on demand — it is the working memory of the project.

Read it before you act. Update it when you change the world.

## Directory layers

| Path | Layer | Ownership |
|------|-------|-----------|
| `wiki/sources/` | Raw, immutable inputs (brief, spec, pinned external docs) | Human authored. **Never edit.** |
| `wiki/entities/` | Concrete things: DB tables, screens, edge functions | Agent + human |
| `wiki/concepts/` | Flows, mechanics, invariants | Agent + human |
| `wiki/synthesis/` | Cross-cutting pages: architecture, security, scope | Agent + human |
| `wiki/index.md` | One-line catalog of every wiki page | Agent maintains |
| `wiki/log.md` | Append-only record of wiki mutations | Agent maintains |
| `docs/superpowers/specs/` | Dated design snapshots | Human + brainstorming flow |

## Before every task — read-first protocol

Do this BEFORE touching code or proposing changes. Non-negotiable.

1. **Read `wiki/index.md`** in full. It is kept under 200 lines and tells you what exists.
2. **Scan the index for pages relevant to the task.** Use the task's nouns and verbs as keywords. Read every page that might be relevant, not just the obvious one.
3. **If the task mentions a DB table, screen, edge function, or named flow, read its entity/concept page.**
4. **If `wiki/sources/` has a doc matching the task, read it.** Sources are the ground truth.
5. If a relevant page is missing or clearly stale, flag it to the user before proceeding — do not silently work around missing context.

When in doubt, read more. Reading a wiki page is cheaper than writing broken code.

## While working — wiki and code are co-authored

When you change code, ask: does any wiki page now lie?

- Renaming a table → update `wiki/entities/tables/<table>.md`.
- Changing a flow → update `wiki/concepts/<flow>.md`.
- Adding a screen, edge function, or concept → add a new page AND add it to `wiki/index.md`.
- Changing scope or scope boundaries → update `wiki/synthesis/v1-scope.md`.

Wiki updates go in the **same change** as the code, not after. A PR or commit that changes reality without updating the wiki is incomplete.

## After a meaningful change — log it

Append one line to `wiki/log.md`:

```
## [YYYY-MM-DD] <verb> | <what changed>
- touched: <path>, <path>
- reason: <one phrase>
```

Verbs: `add`, `edit`, `rename`, `remove`, `ingest` (new source), `lint` (health pass). Keep entries terse; the log is for skim, not exegesis.

## Wiki page conventions

- **Frontmatter-free.** Start with an H1 that names the page subject exactly.
- **First paragraph is a 1-3 sentence summary** — this is what gets read first during a scan.
- **Link liberally.** Use relative paths: `[day-roll](../concepts/day-roll.md)`.
- **Short > long.** If a page exceeds ~150 lines, split it or summarize.
- **Dated claims include the date.** "As of 2026-05-03, V1 targets..."
- **No code duplication.** Reference the source file path and line range, don't paste the code.
- **No speculation.** If something isn't decided, say "open" and point to the deciding spec.

## Lint pass — weekly or on demand

When the user asks for a wiki lint, or after a large refactor:

1. Walk every page in `entities/`, `concepts/`, `synthesis/`.
2. For each page: does its claim match the current code? Flag drift.
3. Check every link. Flag broken ones.
4. Compare `wiki/index.md` to actual file list. Flag missing or orphaned entries.
5. Look for contradictions between pages.
6. Report findings to the user as a checklist. Do not fix silently — some "drifts" are intentional user decisions.

Log the lint: `## [YYYY-MM-DD] lint | found N issues, see message`.

## What the wiki is NOT

- Not a replacement for the design spec (`docs/superpowers/specs/...`). The spec is a dated snapshot used for brainstorming → planning → implementation. The wiki is the living working notes.
- Not documentation for end users.
- Not a blog or a changelog — the log is terse, not narrative.
- Not a dumping ground. If a fact has no reader, it doesn't belong.

## Default behaviors specific to this project

- Timezone-sensitive date math: always use `src/lib/time.ts` helpers when implemented; never use device-local or UTC dates directly for "today" logic.
- Kid device has a SELECT-only Supabase token. If you find yourself writing an INSERT/UPDATE from the kid screen, stop — that's a design violation.
- No kid-facing failure states. Confidence-first. See `wiki/concepts/kid-screen-states.md` and `wiki/synthesis/v1-scope.md` for what that means and does not mean.
- Parent is the only write source for `task_completions`, `ai_insights` apply/dismiss, and most `children` fields. Edge functions write the rest.

## Project commands (as they come online)

- `npm run dev` — Expo dev server (once week 1 scaffolding lands)
- `npm run lint` — code lint
- `npm run wiki:lint` — wiki health check (TBD helper script)

## If you are Cursor or another agent

The rules above apply to you too. The mirror at `.cursor/rules/sproutly.mdc` is the Cursor-native copy. If they ever disagree, `CLAUDE.md` is the source of truth and the `.mdc` is stale.
