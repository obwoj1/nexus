create table if not exists public.study_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  title text not null check (char_length(title) between 1 and 180),
  source_name text not null default 'Pasted notes' check (char_length(source_name) <= 240),
  content text not null check (char_length(content) between 1 and 100000),
  created_at timestamptz not null default now(),
  foreign key (course_id, user_id) references public.study_courses(id, user_id) on delete cascade
);

create index if not exists study_sources_user_created_idx on public.study_sources(user_id, created_at desc);
alter table public.study_sources enable row level security;
create policy "Users manage their own study sources" on public.study_sources
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
