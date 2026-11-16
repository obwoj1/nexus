create table if not exists public.nexus_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  instructions text not null default '' check (char_length(instructions) <= 3000),
  context text not null default '' check (char_length(context) <= 25000),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists nexus_projects_user_idx on public.nexus_projects(user_id, updated_at desc);
alter table public.nexus_projects enable row level security;
create policy "Users manage their own projects" on public.nexus_projects
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
