-- 0005_child_avatar_emoji.sql
-- Adds a nullable emoji avatar to children, chosen by the parent in Edit Profile.
-- Null means "use the default" — UI falls back to 🦄.

alter table public.children
  add column if not exists avatar_emoji text;
