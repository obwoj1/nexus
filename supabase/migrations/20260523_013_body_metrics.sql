-- ──────────────────────────────────────────────────────────────────────────────
-- Body metrics — daily weight, body fat %, and measurements log
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  weight_lbs  numeric(5,1),
  body_fat_pct numeric(4,1),
  notes       text,
  created_at  timestamptz default now() not null,
  unique (user_id, date)
);

alter table public.body_metrics enable row level security;
create policy "Users manage own body metrics"
  on public.body_metrics
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
