-- ──────────────────────────────────────────────────────────────────────────────
-- Wardrobe — clothing items + saved outfits
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.wardrobe_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  category     text not null, -- top | bottom | shoes | outerwear | headwear | accessory
  color        text,
  description  text,          -- Gemini-generated description
  brand        text,
  created_at   timestamptz default now() not null
);

alter table public.wardrobe_items enable row level security;
drop policy if exists "Users manage own wardrobe items" on public.wardrobe_items;
create policy "Users manage own wardrobe items"
  on public.wardrobe_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.saved_outfits (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  name                 text not null,
  item_ids             uuid[] not null,
  generated_image_path text,
  caption              text,
  worn_count           int not null default 0,
  last_worn            date,
  created_at           timestamptz default now() not null
);

alter table public.saved_outfits enable row level security;
drop policy if exists "Users manage own saved outfits" on public.saved_outfits;
create policy "Users manage own saved outfits"
  on public.saved_outfits
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for wardrobe photos + generated flat-lays
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wardrobe', 'wardrobe', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

drop policy if exists "Users upload own wardrobe photos" on storage.objects;
drop policy if exists "Users view own wardrobe photos" on storage.objects;
drop policy if exists "Users delete own wardrobe photos" on storage.objects;

create policy "Users upload own wardrobe photos"
  on storage.objects for insert
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users view own wardrobe photos"
  on storage.objects for select
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own wardrobe photos"
  on storage.objects for delete
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
