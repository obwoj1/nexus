create table if not exists public.push_subscriptions (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_own" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
