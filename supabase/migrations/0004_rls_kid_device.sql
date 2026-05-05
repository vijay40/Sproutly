-- Kid device policies. JWT includes custom claims:
--   kid_device_id, child_id, family_id
-- Kid token is SELECT-only.

create or replace function public.jwt_kid_device_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'kid_device_id', '')::uuid
$$;

create or replace function public.jwt_kid_child_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'child_id', '')::uuid
$$;

create or replace function public.jwt_kid_family_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'family_id', '')::uuid
$$;

-- families: kid can read its own family row
create policy "kid_select_family" on public.families
  for select using (
    public.jwt_kid_device_id() is not null
    and id = public.jwt_kid_family_id()
  );

-- children: kid can read its own child row
create policy "kid_select_child" on public.children
  for select using (
    public.jwt_kid_device_id() is not null
    and id = public.jwt_kid_child_id()
  );

-- tasks: kid can read own child's tasks
create policy "kid_select_tasks" on public.tasks
  for select using (
    public.jwt_kid_device_id() is not null
    and child_id = public.jwt_kid_child_id()
  );

-- task_completions: kid can read
create policy "kid_select_completions" on public.task_completions
  for select using (
    public.jwt_kid_device_id() is not null
    and child_id = public.jwt_kid_child_id()
  );

-- daily_summaries: kid can read
create policy "kid_select_summaries" on public.daily_summaries
  for select using (
    public.jwt_kid_device_id() is not null
    and child_id = public.jwt_kid_child_id()
  );
