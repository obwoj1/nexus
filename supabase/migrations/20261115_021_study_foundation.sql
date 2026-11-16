create table if not exists public.study_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  code text not null default '' check (char_length(code) <= 40),
  term text not null default '' check (char_length(term) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.study_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  due_at timestamptz,
  details text not null default '' check (char_length(details) <= 8000),
  status text not null default 'todo' check (status in ('todo', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (course_id, user_id) references public.study_courses(id, user_id) on delete cascade
);

create index if not exists study_courses_user_term_idx on public.study_courses(user_id, term, name);
create index if not exists study_assignments_user_due_idx on public.study_assignments(user_id, due_at) where status = 'todo';

alter table public.study_courses enable row level security;
alter table public.study_assignments enable row level security;

create policy "Users manage their own study courses" on public.study_courses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own study assignments" on public.study_assignments
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
