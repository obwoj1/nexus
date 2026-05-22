alter table public.notes add column if not exists is_journal boolean not null default false;

-- Mark any existing journal notes (from the old "Journal — Mon, May 20" naming convention)
update public.notes set is_journal = true where title like 'Journal — %';
