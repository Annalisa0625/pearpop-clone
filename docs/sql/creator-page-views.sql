-- Simple page-open tracking for creator public pages.
-- Each public page render records one row. Repeat visits are counted again.

create table if not exists public.creator_page_views (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  page_type text not null check (page_type in ('link', 'profile')),
  viewed_at timestamptz not null default now()
);

create index if not exists creator_page_views_owner_type_viewed_idx
  on public.creator_page_views (owner_user_id, page_type, viewed_at desc);

alter table public.creator_page_views enable row level security;

comment on table public.creator_page_views is
  'Simple page-open events for creator Link and Trend Mart profile pages. Read and write through trusted server routes only.';
