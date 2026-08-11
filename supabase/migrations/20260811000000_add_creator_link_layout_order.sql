-- Optional cross-type layout order for Trendre Link pages.
-- Runtime readers and writers remain disconnected until this migration is reviewed and applied.
alter table public.creator_link_pages
  add column if not exists layout_order jsonb null;

alter table public.creator_link_pages
  drop constraint if exists creator_link_pages_layout_order_array_check;

alter table public.creator_link_pages
  add constraint creator_link_pages_layout_order_array_check
  check (layout_order is null or jsonb_typeof(layout_order) = 'array');

comment on column public.creator_link_pages.layout_order is
  'Optional ordered tokens: social, work, and link:<uuid>. Null uses the legacy Social, Work, Links order.';
