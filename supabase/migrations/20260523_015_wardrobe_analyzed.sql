-- Add analyzed flag to wardrobe_items
-- Existing rows get analyzed = true (they were already categorized)
alter table public.wardrobe_items
  add column if not exists analyzed boolean not null default false;

-- Allow category to be null for pending items
alter table public.wardrobe_items
  alter column category drop not null;
