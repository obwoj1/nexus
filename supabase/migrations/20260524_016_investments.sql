create table if not exists holdings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  ticker      text        not null,
  name        text        not null,
  asset_type  text        not null default 'stock' check (asset_type in ('stock', 'crypto')),
  quantity    numeric(20, 8) not null check (quantity > 0),
  cost_basis  numeric(20, 8) not null check (cost_basis >= 0),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table holdings enable row level security;

create policy "users can manage their own holdings"
  on holdings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
