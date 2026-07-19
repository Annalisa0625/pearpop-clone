-- Trendre Link MVP Phase 1
-- Supabase SQL Editor でこのファイル全体を実行してください。

begin;

create table if not exists public.creator_link_pages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  display_name text not null,
  bio text null,
  avatar_url text null,
  cover_url text null,
  theme_key text not null default 'night-purple',
  accent_color text null,
  button_style text not null default 'rounded',
  font_style text not null default 'modern',
  status text not null default 'draft',
  is_accepting_inquiries boolean not null default true,
  setup_step smallint not null default 0,
  setup_completed_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_link_pages_status_check
    check (status in ('draft', 'published', 'private')),
  constraint creator_link_pages_theme_key_check
    check (theme_key in ('night-purple', 'soft-ivory', 'minimal-black', 'natural-beige')),
  constraint creator_link_pages_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  constraint creator_link_pages_reserved_slug_check
    check (lower(slug) <> all (array[
      'admin', 'api', 'login', 'logout', 'signup', 'creator', 'creators',
      'company', 'companies', 'dashboard', 'home', 'privacy', 'terms',
      'legal', 'for-creators', 'for-companies', 'notifications', 'settings',
      'support', 'help', 'my', 'b', 'in', 'link', 'trendre', 'trend-mart'
    ]::text[]))
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_link_pages_reserved_slug_check'
      and conrelid = 'public.creator_link_pages'::regclass
  ) then
    alter table public.creator_link_pages
      add constraint creator_link_pages_reserved_slug_check
      check (lower(slug) <> all (array[
        'admin', 'api', 'login', 'logout', 'signup', 'creator', 'creators',
        'company', 'companies', 'dashboard', 'home', 'privacy', 'terms',
        'legal', 'for-creators', 'for-companies', 'notifications', 'settings',
        'support', 'help', 'my', 'b', 'in', 'link', 'trendre', 'trend-mart'
      ]::text[])) not valid;
  end if;
end
$$;

create unique index if not exists creator_link_pages_slug_lower_uidx
  on public.creator_link_pages (lower(slug));
create index if not exists creator_link_pages_owner_user_id_idx
  on public.creator_link_pages (owner_user_id);
create index if not exists creator_link_pages_status_idx
  on public.creator_link_pages (status);
create index if not exists creator_link_pages_updated_at_idx
  on public.creator_link_pages (updated_at desc);

create table if not exists public.creator_link_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_link_pages(id) on delete cascade,
  item_type text not null,
  platform text null,
  title text null,
  description text null,
  url text null,
  image_url text null,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_link_items_item_type_check
    check (item_type in ('social', 'link', 'text', 'image', 'portfolio', 'heading'))
);

create index if not exists creator_link_items_page_sort_idx
  on public.creator_link_items (page_id, sort_order);
create index if not exists creator_link_items_page_visible_idx
  on public.creator_link_items (page_id, is_visible);

create table if not exists public.creator_link_inquiry_types (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_link_pages(id) on delete cascade,
  template_key text null,
  title text not null,
  description text null,
  sort_order integer not null default 0,
  is_enabled boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_link_inquiry_types_template_key_check
    check (
      template_key is null or template_key in (
        'pr_post', 'product_review', 'ugc', 'visit_event',
        'event_appearance', 'model', 'live_tieup', 'music_video', 'other'
      )
    )
);

create unique index if not exists creator_link_inquiry_types_template_uidx
  on public.creator_link_inquiry_types (page_id, template_key)
  where template_key is not null;
create index if not exists creator_link_inquiry_types_page_sort_idx
  on public.creator_link_inquiry_types (page_id, sort_order);
create index if not exists creator_link_inquiry_types_page_enabled_idx
  on public.creator_link_inquiry_types (page_id, is_enabled);

alter table public.creator_inquiries
  add column if not exists link_page_id uuid null,
  add column if not exists inquiry_type_id uuid null,
  add column if not exists inquiry_type_title_snapshot text null,
  add column if not exists purpose text null,
  add column if not exists requested_platform text null,
  add column if not exists offer_type text null,
  add column if not exists submitter_kind text not null default 'company',
  add column if not exists verification_status text not null default 'verified',
  add column if not exists verification_token_hash text null,
  add column if not exists verification_expires_at timestamptz null,
  add column if not exists verified_at timestamptz null,
  add column if not exists public_reference text null;

update public.creator_inquiries
set verification_status = 'verified'
where verification_status is null;

update public.creator_inquiries
set submitter_kind = 'company'
where submitter_kind is null;

alter table public.creator_inquiries
  alter column submitter_kind set default 'company',
  alter column submitter_kind set not null,
  alter column verification_status set default 'verified',
  alter column verification_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_inquiries_link_page_id_fkey'
      and conrelid = 'public.creator_inquiries'::regclass
  ) then
    alter table public.creator_inquiries
      add constraint creator_inquiries_link_page_id_fkey
      foreign key (link_page_id)
      references public.creator_link_pages(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_inquiries_inquiry_type_id_fkey'
      and conrelid = 'public.creator_inquiries'::regclass
  ) then
    alter table public.creator_inquiries
      add constraint creator_inquiries_inquiry_type_id_fkey
      foreign key (inquiry_type_id)
      references public.creator_link_inquiry_types(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_inquiries_verification_status_check'
      and conrelid = 'public.creator_inquiries'::regclass
  ) then
    alter table public.creator_inquiries
      add constraint creator_inquiries_verification_status_check
      check (verification_status in ('pending', 'verified', 'expired')) not valid;
  end if;

end
$$;

alter table public.creator_inquiries
  drop constraint if exists creator_inquiries_trendre_link_status_check;

create unique index if not exists creator_inquiries_public_reference_uidx
  on public.creator_inquiries (public_reference)
  where public_reference is not null;
create index if not exists creator_inquiries_link_page_id_idx
  on public.creator_inquiries (link_page_id);
create index if not exists creator_inquiries_inquiry_type_id_idx
  on public.creator_inquiries (inquiry_type_id);

create or replace function public.set_trendre_link_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_trendre_link_pages_updated_at on public.creator_link_pages;
create trigger set_trendre_link_pages_updated_at
before update on public.creator_link_pages
for each row execute function public.set_trendre_link_updated_at();

drop trigger if exists set_trendre_link_items_updated_at on public.creator_link_items;
create trigger set_trendre_link_items_updated_at
before update on public.creator_link_items
for each row execute function public.set_trendre_link_updated_at();

drop trigger if exists set_trendre_link_inquiry_types_updated_at
  on public.creator_link_inquiry_types;
create trigger set_trendre_link_inquiry_types_updated_at
before update on public.creator_link_inquiry_types
for each row execute function public.set_trendre_link_updated_at();

create or replace function public.seed_creator_link_inquiry_types()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.creator_link_inquiry_types
    (page_id, template_key, title, description, sort_order, is_enabled, is_custom)
  values
    (new.id, 'pr_post', 'PR投稿', 'Instagram投稿・リール・TikTokなどのご相談', 0, false, false),
    (new.id, 'product_review', '商品レビュー', '商品提供・使用感レビュー・紹介投稿', 1, false, false),
    (new.id, 'ugc', 'UGC制作', '広告・LP・SNSで使用する写真や動画の制作', 2, false, false),
    (new.id, 'visit_event', '来店・店舗紹介', '店舗PR・体験レポート・施設紹介', 3, false, false),
    (new.id, 'event_appearance', 'イベント出演', 'イベント・展示会・ステージなどへの出演', 4, false, false),
    (new.id, 'model', '撮影モデル', '広告・Web・SNS用素材などのモデル撮影', 5, false, false),
    (new.id, 'live_tieup', 'ライブ・タイアップ', 'ライブ配信・番組・コラボ企画など', 6, false, false),
    (new.id, 'music_video', '楽曲・映像制作', '楽曲・映像・写真・クリエイティブ制作', 7, false, false),
    (new.id, 'other', 'その他', '上記以外の仕事についてのご相談', 8, false, false)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists seed_creator_link_inquiry_types
  on public.creator_link_pages;
create trigger seed_creator_link_inquiry_types
after insert on public.creator_link_pages
for each row execute function public.seed_creator_link_inquiry_types();

insert into public.creator_link_inquiry_types
  (page_id, template_key, title, description, sort_order, is_enabled, is_custom)
select
  page.id,
  seed.template_key,
  seed.title,
  seed.description,
  seed.sort_order,
  false,
  false
from public.creator_link_pages as page
cross join (
  values
    ('pr_post', 'PR投稿', 'Instagram投稿・リール・TikTokなどのご相談', 0),
    ('product_review', '商品レビュー', '商品提供・使用感レビュー・紹介投稿', 1),
    ('ugc', 'UGC制作', '広告・LP・SNSで使用する写真や動画の制作', 2),
    ('visit_event', '来店・店舗紹介', '店舗PR・体験レポート・施設紹介', 3),
    ('event_appearance', 'イベント出演', 'イベント・展示会・ステージなどへの出演', 4),
    ('model', '撮影モデル', '広告・Web・SNS用素材などのモデル撮影', 5),
    ('live_tieup', 'ライブ・タイアップ', 'ライブ配信・番組・コラボ企画など', 6),
    ('music_video', '楽曲・映像制作', '楽曲・映像・写真・クリエイティブ制作', 7),
    ('other', 'その他', '上記以外の仕事についてのご相談', 8)
) as seed(template_key, title, description, sort_order)
on conflict do nothing;

create or replace function public.enforce_trendre_link_slug_ownership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_slug text;
  v_owner_user_id uuid;
begin
  if tg_table_schema <> 'public' then
    raise exception 'Trendre Link slug validation is only available for public tables.';
  end if;

  case tg_table_name
    when 'creator_link_pages' then
      if tg_op = 'UPDATE'
        and new.slug is not distinct from old.slug
        and new.owner_user_id is not distinct from old.owner_user_id then
        return new;
      end if;
      v_slug := new.slug;
      v_owner_user_id := new.owner_user_id;
    when 'creators' then
      if tg_op = 'UPDATE'
        and new.public_slug is not distinct from old.public_slug
        and new.user_id is not distinct from old.user_id then
        return new;
      end if;
      v_slug := new.public_slug;
      v_owner_user_id := new.user_id;
    when 'profiles' then
      if tg_op = 'UPDATE'
        and new.username is not distinct from old.username
        and new.id is not distinct from old.id then
        return new;
      end if;
      v_slug := new.username;
      v_owner_user_id := new.id;
    else
      raise exception 'Unsupported table for Trendre Link slug validation: %', tg_table_name;
  end case;

  if v_slug is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(v_slug), 0));

  if tg_table_name = 'creator_link_pages'
    and lower(v_slug) = any (array[
      'admin', 'api', 'login', 'logout', 'signup', 'creator', 'creators',
      'company', 'companies', 'dashboard', 'home', 'privacy', 'terms',
      'legal', 'for-creators', 'for-companies', 'notifications', 'settings',
      'support', 'help', 'my', 'b', 'in', 'link', 'trendre', 'trend-mart'
    ]::text[]) then
    raise exception using
      errcode = '23514',
      message = 'このslugはTrendre Linkの予約語です。';
  end if;

  if exists (
    select 1
    from public.creator_link_pages as page
    where lower(page.slug) = lower(v_slug)
      and page.owner_user_id <> v_owner_user_id
      and not (
        tg_table_name = 'creator_link_pages'
        and page.id = new.id
      )
  ) or exists (
    select 1
    from public.creators as creator
    where creator.public_slug is not null
      and lower(creator.public_slug) = lower(v_slug)
      and creator.user_id <> v_owner_user_id
      and not (
        tg_table_name = 'creators'
        and creator.id = new.id
      )
  ) or exists (
    select 1
    from public.profiles as profile
    where profile.username is not null
      and lower(profile.username) = lower(v_slug)
      and profile.id <> v_owner_user_id
      and not (
        tg_table_name = 'profiles'
        and profile.id = new.id
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'このslugは別のユーザーが使用しています。';
  end if;

  return new;
end;
$$;

drop trigger if exists trendre_link_enforce_slug_ownership
  on public.creator_link_pages;
create trigger trendre_link_enforce_slug_ownership
before insert or update of slug, owner_user_id on public.creator_link_pages
for each row execute function public.enforce_trendre_link_slug_ownership();

drop trigger if exists trendre_link_enforce_slug_ownership
  on public.creators;
create trigger trendre_link_enforce_slug_ownership
before insert or update of public_slug, user_id on public.creators
for each row execute function public.enforce_trendre_link_slug_ownership();

drop trigger if exists trendre_link_enforce_slug_ownership
  on public.profiles;
create trigger trendre_link_enforce_slug_ownership
before insert or update of username, id on public.profiles
for each row execute function public.enforce_trendre_link_slug_ownership();

drop function if exists public.is_creator_link_slug_available(text, uuid);

create or replace function public.is_creator_link_slug_available(
  p_slug text,
  p_exclude_page_id uuid default null,
  p_owner_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with caller_access as (
    select coalesce(
      p_owner_user_id is not null
      and (
        auth.role() = 'service_role'
        or p_owner_user_id = auth.uid()
      ),
      false
    ) as can_exclude_owner
  )
  select
    p_slug is not null
    and p_slug = lower(p_slug)
    and p_slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
    and lower(p_slug) <> all (array[
      'admin', 'api', 'login', 'logout', 'signup', 'creator', 'creators',
      'company', 'companies', 'dashboard', 'home', 'privacy', 'terms',
      'legal', 'for-creators', 'for-companies', 'notifications', 'settings',
      'support', 'help', 'my', 'b', 'in', 'link', 'trendre', 'trend-mart'
    ]::text[])
    and not exists (
      select 1
      from public.creator_link_pages as page
      cross join caller_access
      where lower(page.slug) = lower(p_slug)
        and (
          not caller_access.can_exclude_owner
          or page.owner_user_id <> p_owner_user_id
          or p_exclude_page_id is null
          or page.id <> p_exclude_page_id
        )
    )
    and not exists (
      select 1
      from public.creators as creator
      cross join caller_access
      where creator.public_slug is not null
        and lower(creator.public_slug) = lower(p_slug)
        and (
          not caller_access.can_exclude_owner
          or creator.user_id <> p_owner_user_id
        )
    )
    and not exists (
      select 1
      from public.profiles as profile
      cross join caller_access
      where profile.username is not null
        and lower(profile.username) = lower(p_slug)
        and (
          not caller_access.can_exclude_owner
          or profile.id <> p_owner_user_id
        )
    );
$$;

revoke all on function public.is_creator_link_slug_available(text, uuid, uuid) from public;
grant execute on function public.is_creator_link_slug_available(text, uuid, uuid)
  to anon, authenticated, service_role;

grant select on table
  public.creator_link_pages,
  public.creator_link_items,
  public.creator_link_inquiry_types
to anon;

grant select, insert, update, delete on table
  public.creator_link_pages,
  public.creator_link_items,
  public.creator_link_inquiry_types
to authenticated;

grant select on table public.creator_inquiries to authenticated;

grant all on table
  public.creator_link_pages,
  public.creator_link_items,
  public.creator_link_inquiry_types,
  public.creator_inquiries
to service_role;

alter table public.creator_link_pages enable row level security;
alter table public.creator_link_items enable row level security;
alter table public.creator_link_inquiry_types enable row level security;
alter table public.creator_inquiries enable row level security;

drop policy if exists trendre_link_pages_public_select on public.creator_link_pages;
create policy trendre_link_pages_public_select
on public.creator_link_pages for select
to anon, authenticated
using (status = 'published');

drop policy if exists trendre_link_pages_owner_select on public.creator_link_pages;
create policy trendre_link_pages_owner_select
on public.creator_link_pages for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists trendre_link_pages_owner_insert on public.creator_link_pages;
create policy trendre_link_pages_owner_insert
on public.creator_link_pages for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.creators
    where creators.id = creator_id and creators.user_id = auth.uid()
  )
);

drop policy if exists trendre_link_pages_owner_update on public.creator_link_pages;
create policy trendre_link_pages_owner_update
on public.creator_link_pages for update
to authenticated
using (owner_user_id = auth.uid())
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from public.creators
    where creators.id = creator_id and creators.user_id = auth.uid()
  )
);

drop policy if exists trendre_link_pages_owner_delete on public.creator_link_pages;
create policy trendre_link_pages_owner_delete
on public.creator_link_pages for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists trendre_link_items_public_select on public.creator_link_items;
create policy trendre_link_items_public_select
on public.creator_link_items for select
to anon, authenticated
using (
  is_visible
  and exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.status = 'published'
  )
);

drop policy if exists trendre_link_items_owner_all on public.creator_link_items;
create policy trendre_link_items_owner_all
on public.creator_link_items for all
to authenticated
using (
  exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.owner_user_id = auth.uid()
  )
);

drop policy if exists trendre_link_inquiry_types_public_select
  on public.creator_link_inquiry_types;
create policy trendre_link_inquiry_types_public_select
on public.creator_link_inquiry_types for select
to anon, authenticated
using (
  is_enabled
  and exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.status = 'published'
  )
);

drop policy if exists trendre_link_inquiry_types_owner_all
  on public.creator_link_inquiry_types;
create policy trendre_link_inquiry_types_owner_all
on public.creator_link_inquiry_types for all
to authenticated
using (
  exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.creator_link_pages
    where creator_link_pages.id = page_id
      and creator_link_pages.owner_user_id = auth.uid()
  )
);

drop policy if exists trendre_link_inquiries_creator_select
  on public.creator_inquiries;
create policy trendre_link_inquiries_creator_select
on public.creator_inquiries for select
to authenticated
using (creator_user_id = auth.uid());

drop policy if exists trendre_link_inquiries_creator_update
  on public.creator_inquiries;

drop policy if exists trendre_link_inquiries_company_select
  on public.creator_inquiries;
create policy trendre_link_inquiries_company_select
on public.creator_inquiries for select
to authenticated
using (company_user_id = auth.uid());

drop policy if exists trendre_link_inquiries_public_insert
  on public.creator_inquiries;

-- 新しいpermissive INSERTポリシーやanon/authenticated向けINSERT権限は
-- 追加しない。既存DBに許可が残っている場合だけ、以下のrestrictive
-- policyが公開INSERTに対する追加防御として働く。
drop policy if exists trendre_link_inquiries_public_insert_guard
  on public.creator_inquiries;
create policy trendre_link_inquiries_public_insert_guard
on public.creator_inquiries as restrictive for insert
to anon, authenticated
with check (
  public.creator_inquiries.converted_order_id is null
  and public.creator_inquiries.converted_request_id is null
  and public.creator_inquiries.public_reference is null
  and public.creator_inquiries.verification_token_hash is null
  and public.creator_inquiries.verification_expires_at is null
  and public.creator_inquiries.verified_at is null
  and (
    (
      public.creator_inquiries.link_page_id is null
      and public.creator_inquiries.inquiry_type_id is null
      and public.creator_inquiries.inquiry_type_title_snapshot is null
      and public.creator_inquiries.status = 'new'
      and public.creator_inquiries.source = 'public_profile'
      and public.creator_inquiries.verification_status = 'verified'
      and public.creator_inquiries.submitter_kind = 'company'
      and public.creator_inquiries.company_user_id is not distinct from auth.uid()
      and public.creator_inquiries.inquiry_type in (
        'pr_post', 'product_review', 'visit_event', 'ugc', 'other'
      )
      and exists (
        select 1
        from public.creators as creator
        where creator.id = public.creator_inquiries.creator_id
          and creator.user_id = public.creator_inquiries.creator_user_id
          and creator.is_public = true
          and creator.approval_status = 'approved'
          and creator.is_suspended = false
      )
    )
    or
    (
      public.creator_inquiries.link_page_id is not null
      and public.creator_inquiries.source = 'trendre_link'
      and public.creator_inquiries.submitter_kind = 'company'
      and public.creator_inquiries.inquiry_type_id is not null
      and (
        (
          auth.uid() is null
          and public.creator_inquiries.company_user_id is null
          and public.creator_inquiries.verification_status = 'pending'
          and public.creator_inquiries.status = 'pending_verification'
        )
        or
        (
          auth.uid() is not null
          and public.creator_inquiries.company_user_id = auth.uid()
          and public.creator_inquiries.verification_status = 'verified'
          and public.creator_inquiries.status = 'new'
        )
      )
      and exists (
        select 1
        from public.creator_link_pages as page
        join public.creator_link_inquiry_types as inquiry_type
          on inquiry_type.page_id = page.id
        where page.id = public.creator_inquiries.link_page_id
          and page.status = 'published'
          and page.is_accepting_inquiries = true
          and page.creator_id = public.creator_inquiries.creator_id
          and page.owner_user_id = public.creator_inquiries.creator_user_id
          and inquiry_type.id = public.creator_inquiries.inquiry_type_id
          and inquiry_type.is_enabled = true
          and (
            (
              inquiry_type.template_key is not null
              and public.creator_inquiries.inquiry_type = inquiry_type.template_key
            )
            or
            (
              inquiry_type.template_key is null
              and public.creator_inquiries.inquiry_type = 'other'
            )
          )
          and public.creator_inquiries.inquiry_type_title_snapshot = inquiry_type.title
      )
    )
  )
);

commit;
