-- ──────────────────────────────────────────────────────────────────────────────
-- Custom exercises (user-created, in addition to the global seed)
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.custom_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  muscle_group text not null,
  equipment    text not null,
  type         text not null default 'strength',
  created_at   timestamptz default now() not null,
  unique (user_id, name)
);

alter table public.custom_exercises enable row level security;
create policy "Users manage own custom exercises"
  on public.custom_exercises
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
