-- C-only release hardening. This migration intentionally preserves service_role
-- paths and existing Creator Link public policies while denying Data API access
-- to private Creator, Company, and internal data.

-- Private Creator identity/profile data: owner-only rows and browser-required
-- columns only. Signup and Link bootstrap use service_role, not browser INSERT.
alter table public.creators enable row level security;

drop policy if exists creators_select_all_dev on public.creators;
drop policy if exists creators_insert_own on public.creators;
drop policy if exists creators_select_own on public.creators;
drop policy if exists creators_select_owner on public.creators;
drop policy if exists creators_update_own on public.creators;
drop policy if exists creators_update_owner on public.creators;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'creators'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

create policy creators_select_owner
  on public.creators for select to authenticated
  using (user_id = (select auth.uid()));

create policy creators_update_owner
  on public.creators for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all privileges on table public.creators from anon, authenticated;
grant select (
  id, user_id, display_name, full_name, category, country, prefecture, city,
  can_receive_products, content_language, response_language, sub_categories,
  avatar_url, is_public, approval_status
) on table public.creators to authenticated;
grant update (
  display_name, category, country, prefecture, city, can_receive_products,
  content_language, response_language, sub_categories, avatar_url, is_public,
  updated_at
) on table public.creators to authenticated;

-- Profiles are only read or upserted by their owner in the browser. Username
-- availability is checked through a service-role Route Handler.
alter table public.profiles enable row level security;

drop policy if exists "profiles select own row" on public.profiles;
drop policy if exists "profiles update own row" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_company_select_public_creators on public.profiles;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

create policy profiles_select_owner
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_owner
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_owner
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all privileges on table public.profiles from anon, authenticated;
grant select (id, username) on table public.profiles to authenticated;
grant insert (
  id, category, avatar_url, is_public, public_profile_completed,
  onboarding_completed, updated_at
) on table public.profiles to authenticated;
grant update (
  id, category, avatar_url, is_public, public_profile_completed,
  onboarding_completed, updated_at
) on table public.profiles to authenticated;

-- Social accounts are Creator-managed data. No public Trendre Link caller
-- reads this table in C-only; published Links use creator_link_* tables.
alter table public.creator_social_accounts enable row level security;

drop policy if exists creator_social_accounts_select_own on public.creator_social_accounts;
drop policy if exists creator_social_accounts_insert_own on public.creator_social_accounts;
drop policy if exists creator_social_accounts_update_own on public.creator_social_accounts;
drop policy if exists creator_social_accounts_delete_own on public.creator_social_accounts;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'creator_social_accounts'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

create policy creator_social_accounts_select_owner
  on public.creator_social_accounts for select to authenticated
  using (exists (
    select 1 from public.creators c
    where c.id = creator_social_accounts.creator_id
      and c.user_id = (select auth.uid())
  ));

create policy creator_social_accounts_insert_owner
  on public.creator_social_accounts for insert to authenticated
  with check (exists (
    select 1 from public.creators c
    where c.id = creator_social_accounts.creator_id
      and c.user_id = (select auth.uid())
  ));

create policy creator_social_accounts_update_owner
  on public.creator_social_accounts for update to authenticated
  using (exists (
    select 1 from public.creators c
    where c.id = creator_social_accounts.creator_id
      and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.creators c
    where c.id = creator_social_accounts.creator_id
      and c.user_id = (select auth.uid())
  ));

create policy creator_social_accounts_delete_owner
  on public.creator_social_accounts for delete to authenticated
  using (exists (
    select 1 from public.creators c
    where c.id = creator_social_accounts.creator_id
      and c.user_id = (select auth.uid())
  ));

revoke all privileges on table public.creator_social_accounts from anon, authenticated;
grant select (
  creator_id, platform, url, handle, follower_range, audience_country, created_at
) on table public.creator_social_accounts to authenticated;
grant insert (
  creator_id, platform, url, handle, follower_range, audience_country
) on table public.creator_social_accounts to authenticated;
grant delete on table public.creator_social_accounts to authenticated;

-- The Layout Shell may display only the signed-in Creator's active limit.
alter table public.user_suspensions enable row level security;

drop policy if exists user_suspensions_select_own on public.user_suspensions;
drop policy if exists user_suspensions_select_owner on public.user_suspensions;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_suspensions'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

create policy user_suspensions_select_owner
  on public.user_suspensions for select to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.user_suspensions from anon, authenticated;
grant select (user_id, level, is_active, reason, created_at)
  on table public.user_suspensions to authenticated;

-- C-only does not expose these internal/Company data surfaces through the
-- browser. service_role retains its existing privileges.
revoke all privileges on table public.admin_request_meta from anon, authenticated;
revoke all privileges on table public.chats from anon, authenticated;
revoke all privileges on table public.danger_message_flags from anon, authenticated;
revoke all privileges on table public.messages from anon, authenticated;
revoke all privileges on table public.requests from anon, authenticated;
revoke all privileges on table public.signup_requests from anon, authenticated;
revoke all privileges on table public.signup_tokens from anon, authenticated;
revoke all privileges on table public.user_statuses from anon, authenticated;

-- Marketplace public browsing is disabled in C-only. Keep existing owner CRUD
-- policies for menus and portfolio assets; only remove their public reads.
drop policy if exists public_active_creator_menus_select on public.creator_menus;
drop policy if exists public_creator_portfolio_assets_select on public.creator_portfolio_assets;
revoke all privileges on table public.creator_menus from anon;
revoke all privileges on table public.creator_portfolio_assets from anon;

-- No C-only caller uses this view. Revoking prevents a security-definer view
-- from becoming an alternate path around base-table RLS.
revoke all privileges on table public.public_profiles from anon, authenticated;

-- Browser callers never invoke these functions directly. Explicitly revoke
-- PUBLIC as PostgreSQL grants function EXECUTE to PUBLIC by default.
revoke execute on function public.complete_creator_signup(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_creator_signup(uuid, jsonb) to service_role;

revoke execute on function public.create_app_notification(
  uuid, uuid, text, text, text, text, text, text, uuid, uuid, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.create_app_notification(
  uuid, uuid, text, text, text, text, text, text, uuid, uuid, text, text, jsonb, text
) to service_role;

revoke execute on function public.enqueue_line_delivery_for_notification(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_line_delivery_for_notification(uuid, uuid, text, text)
  to service_role;

revoke execute on function public.get_payout_ready_creator_ids() from public, anon, authenticated;
grant execute on function public.get_payout_ready_creator_ids() to service_role;

revoke execute on function public.is_creator_link_slug_available(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_creator_link_slug_available(text, uuid, uuid)
  to service_role;

revoke execute on function public.mark_chat_read(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_chat_read(uuid, uuid) to service_role;

revoke execute on function public.seed_creator_link_inquiry_types() from public, anon, authenticated;
grant execute on function public.seed_creator_link_inquiry_types() to service_role;
