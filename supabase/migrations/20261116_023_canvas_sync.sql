alter table public.study_courses
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text;
alter table public.study_courses
  add constraint study_courses_source_check check (source in ('manual', 'canvas'));
create unique index if not exists study_courses_external_idx
  on public.study_courses(user_id, external_id);

alter table public.study_assignments
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text;
alter table public.study_assignments
  add constraint study_assignments_source_check check (source in ('manual', 'canvas'));
create unique index if not exists study_assignments_external_idx
  on public.study_assignments(user_id, external_id);
