create table if not exists public.notes (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null default 'Untitled',
  content     jsonb       not null default '[]'::jsonb,
  is_pinned   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Users can read own notes"
  on public.notes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on public.notes
  for each row execute procedure public.set_updated_at();
