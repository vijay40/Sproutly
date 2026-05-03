-- Sproutly V1 initial schema. See wiki/entities/tables/*.md for per-table notes.

create extension if not exists pgcrypto;

-- families
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid references auth.users on delete cascade,
  timezone text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists families_parent_user_id_uq on public.families(parent_user_id);

-- children
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  name text not null,
  age int,
  avatar_stage int not null default 1,
  successful_days int not null default 0,
  last_evaluated_date date,
  pending_stage_transition boolean not null default false,
  cosmetics jsonb not null default '[]'::jsonb,
  equipped_cosmetics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (avatar_stage between 1 and 5)
);
create index if not exists children_family_id_idx on public.children(family_id);

-- cosmetics catalog
create table if not exists public.cosmetics (
  id text primary key,
  name text not null,
  type text not null check (type in ('horn','mane','background')),
  asset_path text not null
);

-- tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children on delete cascade,
  title text not null,
  icon text,
  category text not null check (category in ('routine','chore','behavior')),
  time_slot text not null check (time_slot in ('morning','afternoon','evening')),
  difficulty int not null default 1 check (difficulty between 1 and 3),
  recurrence text not null check (recurrence in ('daily','weekdays','custom','one_time')),
  recurrence_days int[],
  is_bonus boolean not null default false,
  bonus_cosmetic_id text references public.cosmetics(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists tasks_child_id_idx on public.tasks(child_id);

-- task_completions
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  marked_by_parent boolean not null default true,
  unique (task_id, local_date)
);
create index if not exists task_completions_child_date_idx on public.task_completions(child_id, local_date);

-- daily_summaries
create table if not exists public.daily_summaries (
  child_id uuid not null references public.children on delete cascade,
  local_date date not null,
  total_tasks int not null,
  completed_tasks int not null,
  was_successful boolean not null,
  simplified_from_miss boolean not null default false,
  primary key (child_id, local_date)
);

-- ai_insights
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  insight_text text not null,
  suggestion_type text check (suggestion_type in
    ('difficulty_up','difficulty_down','reschedule','break_task','simplify_tomorrow','generic')),
  task_id uuid references public.tasks on delete set null,
  is_applied boolean not null default false,
  is_dismissed boolean not null default false,
  generated_at timestamptz not null default now(),
  passed_safety_filter boolean not null
);
create index if not exists ai_insights_family_generated_idx on public.ai_insights(family_id, generated_at desc);

-- ai_generation_log
create table if not exists public.ai_generation_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  requested_at timestamptz not null default now(),
  succeeded boolean,
  input_tokens int,
  output_tokens int
);
create index if not exists ai_generation_log_family_req_idx on public.ai_generation_log(family_id, requested_at desc);

-- kid_devices
create table if not exists public.kid_devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  device_token_hash text,
  pairing_code text,
  pairing_code_expires_at timestamptz,
  pairing_attempts int not null default 0,
  paired_at timestamptz,
  last_seen_at timestamptz,
  device_label text,
  check (
    (device_token_hash is not null) or
    (pairing_code is not null and pairing_code_expires_at is not null)
  )
);
create unique index if not exists kid_devices_pairing_code_uq
  on public.kid_devices(pairing_code)
  where pairing_code is not null;
