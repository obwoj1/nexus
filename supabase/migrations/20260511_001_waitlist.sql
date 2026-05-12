-- Waitlist table for invite-only access
create table if not exists public.waitlist (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  email       text        not null unique,
  status      text        not null default 'pending'
                          check (status in ('pending', 'invited', 'rejected')),
  created_at  timestamptz default now() not null
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Anyone (anon) can submit their email to join the waitlist
create policy "Anyone can join waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Only the service role (owner via dashboard) can read or update entries
-- No select/update policy for anon or authenticated = blocked by RLS
