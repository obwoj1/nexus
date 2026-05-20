-- Add Google OAuth token columns to profiles
alter table public.profiles
  add column if not exists google_access_token  text,
  add column if not exists google_refresh_token text,
  add column if not exists google_token_expires_at timestamptz;
