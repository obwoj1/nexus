alter table profiles
  add column if not exists secondary_google_email        text,
  add column if not exists secondary_google_access_token  text,
  add column if not exists secondary_google_refresh_token text,
  add column if not exists secondary_google_token_expires_at timestamptz;
