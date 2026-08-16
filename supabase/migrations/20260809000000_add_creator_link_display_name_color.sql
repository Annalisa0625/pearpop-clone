-- Preserve existing Creator Link appearance by leaving all current rows NULL.
alter table public.creator_link_pages
  add column if not exists display_name_color text null;

alter table public.creator_link_pages
  drop constraint if exists creator_link_pages_display_name_color_check;

alter table public.creator_link_pages
  add constraint creator_link_pages_display_name_color_check
  check (
    display_name_color is null
    or display_name_color ~ '^#[0-9A-Fa-f]{6}$'
  );

comment on column public.creator_link_pages.display_name_color is
  'Optional hexadecimal color applied only to the Creator Link display name.';
