-- Resolve output-column ambiguity in the atomic Creator signup RPC without
-- changing the already-applied migration history.

create or replace function public.complete_creator_signup(
  p_user_id uuid,
  p_payload jsonb
)
returns table (
  status text,
  creator_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_creator_id uuid;
  v_completed boolean := false;
  v_now timestamptz := now();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(state.creator_profile_completed, false)
    into v_completed
  from public.user_states as state
  where state.user_id = p_user_id;

  if coalesce(v_completed, false) then
    select creator.id
      into v_creator_id
    from public.creators as creator
    where creator.user_id = p_user_id;

    return query select 'already_completed'::text, v_creator_id;
    return;
  end if;

  if exists (
    select 1
    from public.user_roles as role_row
    where role_row.user_id = p_user_id
      and role_row.role = 'company'
  ) then
    return query select 'company_conflict'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.profiles as profile
    where profile.username = p_payload ->> 'username'
      and profile.id <> p_user_id
  ) then
    return query select 'username_conflict'::text, null::uuid;
    return;
  end if;

  select creator.id
    into v_creator_id
  from public.creators as creator
  where creator.user_id = p_user_id
  for update;

  if v_creator_id is null then
    insert into public.creators (
      user_id, contact_email, display_name, full_name, gender, birth_date,
      bio, category, country, prefecture, city, can_receive_products,
      content_language, response_language, sub_categories, phone_country_code,
      phone_number, phone_verified_at, approval_status, is_public, is_suspended,
      avatar_url, cover_image_url
    ) values (
      p_user_id,
      nullif(p_payload ->> 'contact_email', ''),
      p_payload ->> 'display_name',
      nullif(p_payload ->> 'full_name', ''),
      nullif(p_payload ->> 'gender', ''),
      nullif(p_payload ->> 'birth_date', '')::date,
      nullif(p_payload ->> 'bio', ''),
      nullif(p_payload ->> 'category', ''),
      nullif(p_payload ->> 'country', ''),
      nullif(p_payload ->> 'prefecture', ''),
      null,
      coalesce((p_payload ->> 'can_receive_products')::boolean, false),
      nullif(p_payload ->> 'content_language', ''),
      nullif(p_payload ->> 'response_language', ''),
      coalesce(array(select jsonb_array_elements_text(p_payload -> 'sub_categories')), array[]::text[]),
      null, null, null, 'approved', false, false,
      nullif(p_payload ->> 'avatar_url', ''), null
    )
    returning id into v_creator_id;
  else
    update public.creators
    set
      contact_email = nullif(p_payload ->> 'contact_email', ''),
      display_name = p_payload ->> 'display_name',
      full_name = nullif(p_payload ->> 'full_name', ''),
      gender = nullif(p_payload ->> 'gender', ''),
      birth_date = nullif(p_payload ->> 'birth_date', '')::date,
      bio = nullif(p_payload ->> 'bio', ''),
      category = nullif(p_payload ->> 'category', ''),
      country = nullif(p_payload ->> 'country', ''),
      prefecture = nullif(p_payload ->> 'prefecture', ''),
      city = null,
      can_receive_products = coalesce((p_payload ->> 'can_receive_products')::boolean, false),
      content_language = nullif(p_payload ->> 'content_language', ''),
      response_language = nullif(p_payload ->> 'response_language', ''),
      sub_categories = coalesce(array(select jsonb_array_elements_text(p_payload -> 'sub_categories')), array[]::text[]),
      avatar_url = nullif(p_payload ->> 'avatar_url', ''),
      cover_image_url = null,
      updated_at = v_now
    where id = v_creator_id;
  end if;

  insert into public.profiles (
    id, username, category, bio, avatar_url, is_public,
    onboarding_completed, public_profile_completed, updated_at
  ) values (
    p_user_id,
    p_payload ->> 'username',
    nullif(p_payload ->> 'category', ''),
    nullif(p_payload ->> 'bio', ''),
    nullif(p_payload ->> 'avatar_url', ''),
    true, true, true, v_now
  )
  on conflict (id) do update
  set
    username = excluded.username,
    category = excluded.category,
    bio = excluded.bio,
    avatar_url = excluded.avatar_url,
    is_public = excluded.is_public,
    onboarding_completed = excluded.onboarding_completed,
    public_profile_completed = excluded.public_profile_completed,
    updated_at = excluded.updated_at;

  delete from public.creator_portfolio_assets as portfolio
  where portfolio.creator_id = v_creator_id;

  insert into public.creator_portfolio_assets (
    creator_id, asset_url, asset_type, title, sort_order, is_public
  )
  select
    v_creator_id, asset.asset_url, 'image', asset.title, asset.sort_order, true
  from jsonb_to_recordset(coalesce(p_payload -> 'portfolio_assets', '[]'::jsonb))
    as asset(asset_url text, title text, sort_order integer);

  delete from public.creator_social_accounts as social_account
  where social_account.creator_id = v_creator_id;

  insert into public.creator_social_accounts (
    creator_id, platform, url, handle, follower_range, audience_country
  )
  select
    v_creator_id,
    social.platform,
    social.url,
    social.handle,
    social.follower_range,
    social.audience_country
  from jsonb_to_recordset(coalesce(p_payload -> 'social_accounts', '[]'::jsonb))
    as social(platform text, url text, handle text, follower_range text, audience_country text);

  delete from public.creator_menus as creator_menu
  where creator_menu.creator_id = v_creator_id;

  insert into public.creator_menus (
    creator_id, title, description, platform, sns, price, currency,
    delivery_days, deliverables, is_active, notes, account_url,
    reference_price_text, allow_secondary_use, category, menu_type, sort_order
  )
  select
    v_creator_id,
    menu.title,
    menu.description,
    menu.platform,
    menu.sns,
    menu.price,
    menu.currency,
    menu.delivery_days,
    menu.deliverables,
    menu.is_active,
    menu.notes,
    menu.account_url,
    menu.reference_price_text,
    menu.allow_secondary_use,
    menu.category,
    menu.menu_type,
    menu.sort_order
  from jsonb_to_recordset(coalesce(p_payload -> 'menus', '[]'::jsonb))
    as menu(
      title text,
      description text,
      platform text,
      sns text,
      price numeric,
      currency text,
      delivery_days integer,
      deliverables text,
      is_active boolean,
      notes text,
      account_url text,
      reference_price_text text,
      allow_secondary_use boolean,
      category text,
      menu_type text,
      sort_order integer
    );

  insert into public.user_roles (user_id, role)
  select p_user_id, 'creator'
  where not exists (
    select 1
    from public.user_roles as role_row
    where role_row.user_id = p_user_id
      and role_row.role = 'creator'
  )
  on conflict do nothing;

  update public.creators
  set
    approval_status = 'approved',
    is_public = true,
    updated_at = v_now
  where id = v_creator_id;

  insert into public.user_states (
    user_id, creator_profile_completed, company_profile_completed,
    onboarding_completed, terms_version, privacy_version, terms_agreed_at,
    privacy_agreed_at, updated_at
  ) values (
    p_user_id,
    true,
    false,
    true,
    nullif(p_payload ->> 'terms_version', ''),
    nullif(p_payload ->> 'privacy_version', ''),
    coalesce(nullif(p_payload ->> 'agreed_at', '')::timestamptz, v_now),
    coalesce(nullif(p_payload ->> 'agreed_at', '')::timestamptz, v_now),
    v_now
  )
  on conflict (user_id) do update
  set
    creator_profile_completed = true,
    onboarding_completed = true,
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version,
    terms_agreed_at = excluded.terms_agreed_at,
    privacy_agreed_at = excluded.privacy_agreed_at,
    updated_at = excluded.updated_at;

  return query select 'completed_now'::text, v_creator_id;
end;
$$;

revoke all on function public.complete_creator_signup(uuid, jsonb) from public;
revoke all on function public.complete_creator_signup(uuid, jsonb) from anon;
revoke all on function public.complete_creator_signup(uuid, jsonb) from authenticated;
grant execute on function public.complete_creator_signup(uuid, jsonb) to service_role;
