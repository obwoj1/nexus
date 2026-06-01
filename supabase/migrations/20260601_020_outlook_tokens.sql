alter table profiles
  add column if not exists outlook_email        text,
  add column if not exists outlook_access_token  text,
  add column if not exists outlook_refresh_token text,
  add column if not exists outlook_token_expires_at timestamptz;
