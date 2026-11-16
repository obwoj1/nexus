create table if not exists public.study_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  front text not null check (char_length(front) between 1 and 2000),
  back text not null check (char_length(back) between 1 and 5000),
  due_at timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0 and interval_days <= 3650),
  repetitions integer not null default 0 check (repetitions >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 4.00),
  created_at timestamptz not null default now(),
  foreign key (course_id, user_id) references public.study_courses(id, user_id) on delete cascade
);

create index if not exists study_cards_due_idx on public.study_cards(user_id, due_at);
alter table public.study_cards enable row level security;
create policy "Users manage their own study cards" on public.study_cards
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
