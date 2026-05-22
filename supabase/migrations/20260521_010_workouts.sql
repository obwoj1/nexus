-- ──────────────────────────────────────────────────────────────────────────────
-- Phase 5: Workouts
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- Exercise library (global, seeded)
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  muscle_group text not null,
  equipment    text not null,
  type         text not null default 'strength'
);

alter table public.exercises enable row level security;
create policy "Anyone can read exercises"
  on public.exercises for select using (true);

-- Workout templates
create table if not exists public.workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now() not null
);

alter table public.workout_templates enable row level security;
create policy "Users manage own templates"
  on public.workout_templates
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Template exercises (ordered list of exercises per template)
create table if not exists public.template_exercises (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid references public.workout_templates(id) on delete cascade not null,
  exercise_id   uuid references public.exercises(id) not null,
  display_order int not null default 0
);

alter table public.template_exercises enable row level security;
create policy "Users manage own template exercises"
  on public.template_exercises
  using (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()
  ));

-- Workout sessions
create table if not exists public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  date             date not null,
  duration_minutes int,
  notes            text,
  template_id      uuid references public.workout_templates(id) on delete set null,
  created_at       timestamptz default now() not null
);

alter table public.workout_sessions enable row level security;
create policy "Users manage own sessions"
  on public.workout_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sets within sessions
create table if not exists public.session_sets (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  set_number  int not null,
  reps        int,
  weight_lbs  numeric(6,2),
  created_at  timestamptz default now() not null
);

alter table public.session_sets enable row level security;
create policy "Users manage own sets"
  on public.session_sets
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- ── Seed exercises ─────────────────────────────────────────────────────────────
insert into public.exercises (name, muscle_group, equipment, type) values
  -- Chest
  ('Bench Press',             'Chest',     'Barbell',    'strength'),
  ('Incline Bench Press',     'Chest',     'Barbell',    'strength'),
  ('Dumbbell Flye',           'Chest',     'Dumbbell',   'strength'),
  ('Push-up',                 'Chest',     'Bodyweight', 'strength'),
  ('Cable Crossover',         'Chest',     'Cable',      'strength'),
  -- Back
  ('Deadlift',                'Back',      'Barbell',    'strength'),
  ('Barbell Row',             'Back',      'Barbell',    'strength'),
  ('Pull-up',                 'Back',      'Bodyweight', 'strength'),
  ('Lat Pulldown',            'Back',      'Machine',    'strength'),
  ('Seated Cable Row',        'Back',      'Cable',      'strength'),
  ('Face Pull',               'Back',      'Cable',      'strength'),
  -- Legs
  ('Squat',                   'Legs',      'Barbell',    'strength'),
  ('Romanian Deadlift',       'Legs',      'Barbell',    'strength'),
  ('Leg Press',               'Legs',      'Machine',    'strength'),
  ('Leg Curl',                'Legs',      'Machine',    'strength'),
  ('Leg Extension',           'Legs',      'Machine',    'strength'),
  ('Calf Raise',              'Legs',      'Machine',    'strength'),
  ('Lunges',                  'Legs',      'Dumbbell',   'strength'),
  -- Shoulders
  ('Overhead Press',          'Shoulders', 'Barbell',    'strength'),
  ('Dumbbell Lateral Raise',  'Shoulders', 'Dumbbell',   'strength'),
  ('Arnold Press',            'Shoulders', 'Dumbbell',   'strength'),
  ('Rear Delt Flye',          'Shoulders', 'Dumbbell',   'strength'),
  -- Arms
  ('Barbell Curl',            'Arms',      'Barbell',    'strength'),
  ('Hammer Curl',             'Arms',      'Dumbbell',   'strength'),
  ('Tricep Pushdown',         'Arms',      'Cable',      'strength'),
  ('Skull Crusher',           'Arms',      'Barbell',    'strength'),
  ('Dips',                    'Arms',      'Bodyweight', 'strength'),
  -- Core
  ('Plank',                   'Core',      'Bodyweight', 'bodyweight'),
  ('Crunches',                'Core',      'Bodyweight', 'bodyweight'),
  ('Leg Raises',              'Core',      'Bodyweight', 'bodyweight'),
  ('Russian Twist',           'Core',      'Bodyweight', 'bodyweight'),
  ('Ab Rollout',              'Core',      'Bodyweight', 'bodyweight'),
  -- Cardio
  ('Running',                 'Cardio',    'Bodyweight', 'cardio'),
  ('Cycling',                 'Cardio',    'Machine',    'cardio'),
  ('Jump Rope',               'Cardio',    'Bodyweight', 'cardio'),
  ('Rowing Machine',          'Cardio',    'Machine',    'cardio')
on conflict (name) do nothing;
