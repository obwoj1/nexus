-- ──────────────────────────────────────────────────────────────────────────────
-- Body progress photos
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.body_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  date         date not null,
  notes        text,
  created_at   timestamptz default now() not null
);

alter table public.body_photos enable row level security;
create policy "Users manage own body photos"
  on public.body_photos
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket (private, 10MB max per file, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'body-progress', 'body-progress', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

-- Storage RLS — user folder is /{user_id}/...
create policy "Users upload own body photos"
  on storage.objects for insert
  with check (bucket_id = 'body-progress' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users view own body photos"
  on storage.objects for select
  using (bucket_id = 'body-progress' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own body photos"
  on storage.objects for delete
  using (bucket_id = 'body-progress' and (storage.foldername(name))[1] = auth.uid()::text);
