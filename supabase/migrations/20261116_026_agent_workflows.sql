create table if not exists public.nexus_agent_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  instructions text not null check (char_length(instructions) between 1 and 3000),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists nexus_agent_workflows_user_idx on public.nexus_agent_workflows(user_id, created_at desc);
alter table public.nexus_agent_workflows enable row level security;
create policy "Users manage their own agent workflows" on public.nexus_agent_workflows
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
