create table if not exists public.nexus_scheduled_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  prompt text not null check (char_length(prompt) between 4 and 3000),
  recurrence text not null default 'once' check (recurrence in ('once', 'daily', 'weekdays', 'weekly')),
  next_run_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'paused', 'running', 'completed', 'failed')),
  last_output text not null default '' check (char_length(last_output) <= 12000),
  last_error text not null default '' check (char_length(last_error) <= 500),
  last_run_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists nexus_scheduled_tasks_due_idx on public.nexus_scheduled_tasks(next_run_at) where status = 'active';
create index if not exists nexus_scheduled_tasks_user_idx on public.nexus_scheduled_tasks(user_id, created_at desc);
alter table public.nexus_scheduled_tasks enable row level security;
create policy "Users manage their own scheduled tasks" on public.nexus_scheduled_tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
