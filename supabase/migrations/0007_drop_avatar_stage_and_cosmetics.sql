-- Drop cosmetics system and avatar_stage (stage derived from successful_days in app).

alter table public.tasks drop column if exists bonus_cosmetic_id;

alter table public.children
  drop column if exists avatar_stage,
  drop column if exists cosmetics,
  drop column if exists equipped_cosmetics;

drop table if exists public.cosmetics;
