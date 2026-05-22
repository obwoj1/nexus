-- ── HABITS ──────────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  color      text        not null default '#C8900A',
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  habit_id   uuid        not null references public.habits(id) on delete cascade,
  date       date        not null,
  unique(habit_id, date)
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                 uuid           default gen_random_uuid() primary key,
  user_id            uuid           not null references auth.users(id) on delete cascade,
  name               text           not null,
  amount             numeric(10,2)  not null,
  billing_cycle      text           not null default 'monthly',
  next_billing_date  date,
  category           text,
  created_at         timestamptz    not null default now()
);

-- ── GOALS ────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text,
  target_date date,
  progress    integer     not null default 0 check (progress between 0 and 100),
  status      text        not null default 'active',
  created_at  timestamptz not null default now()
);

-- ── READING LIST ─────────────────────────────────────────────────────────────
create table if not exists public.reading_list (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  title      text        not null,
  author     text,
  type       text        not null default 'book',
  status     text        not null default 'to-read',
  rating     integer     check (rating between 1 and 5),
  notes      text,
  created_at timestamptz not null default now()
);

-- ── HEALTH METRICS ───────────────────────────────────────────────────────────
create table if not exists public.health_metrics (
  id          uuid           default gen_random_uuid() primary key,
  user_id     uuid           not null references auth.users(id) on delete cascade,
  date        date           not null,
  sleep_hours numeric(4,1),
  water_oz    integer,
  mood        integer        check (mood between 1 and 5),
  weight_lbs  numeric(5,1),
  unique(user_id, date)
);

-- ── IMPORTANT DATES ──────────────────────────────────────────────────────────
create table if not exists public.important_dates (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  label      text        not null,
  date       date        not null,
  type       text        not null default 'other',
  recurring  boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.habits           enable row level security;
alter table public.habit_logs       enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.goals            enable row level security;
alter table public.reading_list     enable row level security;
alter table public.health_metrics   enable row level security;
alter table public.important_dates  enable row level security;

create policy "habits_own"          on public.habits          for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs_own"      on public.habit_logs      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_own"   on public.subscriptions   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_own"           on public.goals           for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reading_list_own"    on public.reading_list    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_metrics_own"  on public.health_metrics  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "important_dates_own" on public.important_dates for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
