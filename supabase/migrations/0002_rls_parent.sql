-- Parent RLS: a parent can touch only their own family's data.

alter table public.families enable row level security;
alter table public.children enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.ai_insights enable row level security;
alter table public.ai_generation_log enable row level security;
alter table public.kid_devices enable row level security;
alter table public.cosmetics enable row level security;

-- families
create policy "parent_select_own_family" on public.families
  for select using (parent_user_id = auth.uid());
create policy "parent_insert_own_family" on public.families
  for insert with check (parent_user_id = auth.uid());
create policy "parent_update_own_family" on public.families
  for update using (parent_user_id = auth.uid())
  with check (parent_user_id = auth.uid());

-- children
create policy "parent_all_own_children" on public.children
  for all using (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  )
  with check (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  );

-- tasks
create policy "parent_all_own_tasks" on public.tasks
  for all using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.parent_user_id = auth.uid()
    )
  )
  with check (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.parent_user_id = auth.uid()
    )
  );

-- task_completions
create policy "parent_all_own_completions" on public.task_completions
  for all using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.parent_user_id = auth.uid()
    )
  )
  with check (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.parent_user_id = auth.uid()
    )
  );

-- daily_summaries (parent read; writes are via rpc/service role later)
create policy "parent_select_own_summaries" on public.daily_summaries
  for select using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.parent_user_id = auth.uid()
    )
  );

-- ai_insights (parent read + update for apply/dismiss)
create policy "parent_select_own_insights" on public.ai_insights
  for select using (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  );
create policy "parent_update_own_insights" on public.ai_insights
  for update using (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  )
  with check (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  );

-- ai_generation_log (no parent access; service role only)

-- kid_devices (parent full access)
create policy "parent_all_own_devices" on public.kid_devices
  for all using (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  )
  with check (
    family_id in (select id from public.families where parent_user_id = auth.uid())
  );

-- cosmetics (public read for everyone)
create policy "cosmetics_public_read" on public.cosmetics for select using (true);
