-- Creator Profile saves are application-data writes. Keep the browser out of
-- direct multi-table mutations and make social replacement atomic when needed.
create or replace function public.save_creator_profile(
  p_user_id uuid,
  p_payload jsonb
)
returns table (creator_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_now timestamptz := now();
  v_display_name text;
  v_category text;
  v_country text;
  v_prefecture text;
  v_content_language text;
  v_response_language text;
  v_avatar_url text;
  v_can_receive_products boolean;
  v_should_publish_creator boolean;
  v_social_accounts_changed boolean;
  v_sub_categories text[];
  v_social jsonb;
  v_platform text;
  v_url text;
  v_handle text;
  v_follower_range text;
  v_audience_country text;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'invalid profile payload';
  end if;

  if jsonb_typeof(p_payload -> 'social_accounts_changed') is distinct from 'boolean' then
    raise exception 'invalid social change flag';
  end if;

  v_display_name := nullif(btrim(p_payload ->> 'display_name'), '');
  v_category := nullif(btrim(p_payload ->> 'category'), '');
  v_country := nullif(btrim(p_payload ->> 'country'), '');
  v_prefecture := nullif(btrim(p_payload ->> 'prefecture'), '');
  v_content_language := nullif(btrim(p_payload ->> 'content_language'), '');
  v_response_language := nullif(btrim(p_payload ->> 'response_language'), '');
  v_avatar_url := nullif(btrim(p_payload ->> 'avatar_url'), '');

  if v_display_name is null or char_length(v_display_name) > 80
    or v_category is null or char_length(v_category) > 120
    or v_country is null or char_length(v_country) > 120
    or char_length(coalesce(v_prefecture, '')) > 500
    or v_content_language is null or char_length(v_content_language) > 80
    or v_response_language is null or char_length(v_response_language) > 80
    or char_length(coalesce(v_avatar_url, '')) > 2048
  then
    raise exception 'invalid profile values';
  end if;

  if jsonb_typeof(p_payload -> 'can_receive_products') is distinct from 'boolean'
    or jsonb_typeof(p_payload -> 'should_publish_creator') is distinct from 'boolean'
  then
    raise exception 'invalid profile value types';
  end if;

  if jsonb_typeof(p_payload -> 'sub_categories') is distinct from 'array' then
    raise exception 'invalid categories';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'sub_categories') as category(value)
    where jsonb_typeof(category.value) <> 'string'
  ) then
    raise exception 'invalid categories';
  end if;

  select array_agg(value order by ordinality)
    into v_sub_categories
  from jsonb_array_elements_text(p_payload -> 'sub_categories') with ordinality as category(value, ordinality);

  if coalesce(array_length(v_sub_categories, 1), 0) = 0
    or array_length(v_sub_categories, 1) > 5
    or exists (
      select 1
      from unnest(v_sub_categories) as category(value)
      where nullif(btrim(category.value), '') is null
        or char_length(btrim(category.value)) > 120
    )
  then
    raise exception 'invalid categories';
  end if;

  v_sub_categories := array(
    select btrim(category.value)
    from unnest(v_sub_categories) as category(value)
  );
  v_can_receive_products := (p_payload ->> 'can_receive_products')::boolean;
  v_should_publish_creator := (p_payload ->> 'should_publish_creator')::boolean;
  v_social_accounts_changed := (p_payload ->> 'social_accounts_changed')::boolean;

  if v_social_accounts_changed then
    if jsonb_typeof(p_payload -> 'social_accounts') is distinct from 'array' then
      raise exception 'invalid social accounts';
    end if;

    if jsonb_array_length(p_payload -> 'social_accounts') = 0
      or jsonb_array_length(p_payload -> 'social_accounts') > 20
    then
      raise exception 'invalid social accounts';
    end if;

    for v_social in select value from jsonb_array_elements(p_payload -> 'social_accounts') loop
      if jsonb_typeof(v_social) <> 'object' then
        raise exception 'invalid social account';
      end if;

      v_platform := nullif(btrim(v_social ->> 'platform'), '');
      v_url := nullif(btrim(v_social ->> 'url'), '');
      v_handle := nullif(btrim(v_social ->> 'handle'), '');
      v_follower_range := nullif(btrim(v_social ->> 'follower_range'), '');
      v_audience_country := nullif(btrim(v_social ->> 'audience_country'), '');

      if v_platform is null
        or v_platform not in ('Instagram', 'TikTok', 'YouTube', 'X', 'Website')
        or v_url is null or char_length(v_url) > 2048
        or v_handle is null or char_length(v_handle) > 320
        or v_follower_range is null or char_length(v_follower_range) > 80
        or v_audience_country is null or char_length(v_audience_country) > 120
      then
        raise exception 'invalid social account values';
      end if;
    end loop;
  elsif p_payload ? 'social_accounts' then
    raise exception 'social accounts must be omitted when unchanged';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select creator.id
    into v_creator_id
  from public.creators as creator
  where creator.user_id = p_user_id
  for update;

  if v_creator_id is null then
    raise exception 'creator not found';
  end if;

  update public.creators as creator
  set
    display_name = v_display_name,
    category = v_category,
    country = v_country,
    prefecture = v_prefecture,
    city = null,
    can_receive_products = v_can_receive_products,
    content_language = v_content_language,
    response_language = v_response_language,
    sub_categories = v_sub_categories,
    avatar_url = v_avatar_url,
    is_public = case when v_should_publish_creator then true else creator.is_public end,
    updated_at = v_now
  where creator.id = v_creator_id;

  insert into public.profiles as profile (
    id,
    category,
    avatar_url,
    is_public,
    public_profile_completed,
    onboarding_completed,
    updated_at
  )
  values (
    p_user_id,
    v_category,
    v_avatar_url,
    true,
    true,
    true,
    v_now
  )
  on conflict (id) do update
  set
    category = excluded.category,
    avatar_url = excluded.avatar_url,
    is_public = excluded.is_public,
    public_profile_completed = excluded.public_profile_completed,
    onboarding_completed = excluded.onboarding_completed,
    updated_at = excluded.updated_at;

  insert into public.user_states as user_state (
    user_id,
    creator_profile_completed,
    onboarding_completed,
    updated_at
  )
  values (p_user_id, true, true, v_now)
  on conflict (user_id) do update
  set
    creator_profile_completed = excluded.creator_profile_completed,
    onboarding_completed = excluded.onboarding_completed,
    updated_at = excluded.updated_at;

  if v_social_accounts_changed then
    delete from public.creator_social_accounts as social_account
    where social_account.creator_id = v_creator_id;

    insert into public.creator_social_accounts (
      creator_id,
      platform,
      url,
      handle,
      follower_range,
      audience_country
    )
    select
      v_creator_id,
      btrim(social.value ->> 'platform'),
      btrim(social.value ->> 'url'),
      btrim(social.value ->> 'handle'),
      btrim(social.value ->> 'follower_range'),
      btrim(social.value ->> 'audience_country')
    from jsonb_array_elements(p_payload -> 'social_accounts') as social(value);
  end if;

  return query select v_creator_id;
end;
$$;

revoke all on function public.save_creator_profile(uuid, jsonb) from public;
revoke all on function public.save_creator_profile(uuid, jsonb) from anon;
revoke all on function public.save_creator_profile(uuid, jsonb) from authenticated;
grant execute on function public.save_creator_profile(uuid, jsonb) to service_role;
