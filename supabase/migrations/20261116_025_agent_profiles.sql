create table if not exists public.nexus_agent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  specialty text not null check (char_length(specialty) between 1 and 120),
  instructions text not null check (char_length(instructions) between 1 and 1800),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists nexus_agent_profiles_user_idx on public.nexus_agent_profiles(user_id, created_at);
alter table public.nexus_agent_profiles enable row level security;
create policy "Users manage their own agent profiles" on public.nexus_agent_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
