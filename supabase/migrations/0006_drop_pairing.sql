-- Flexible device roles: remove kid-device pairing (superseded by parent-session kid view + REST).

drop policy if exists "kid_select_family" on public.families;
drop policy if exists "kid_select_child" on public.children;
drop policy if exists "kid_select_tasks" on public.tasks;
drop policy if exists "kid_select_completions" on public.task_completions;
drop policy if exists "kid_select_summaries" on public.daily_summaries;

drop function if exists public.create_pairing_code();

drop table if exists public.kid_devices;

drop function if exists public.jwt_kid_device_id();
drop function if exists public.jwt_kid_child_id();
drop function if exists public.jwt_kid_family_id();
