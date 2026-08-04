-- Trendre Link: quote checkout and order conversion foundation.
--
-- Purpose:
-- - Track Stripe Checkout state for an accepted Link quote.
-- - Link the resulting formal order back to the original inquiry and quote.
-- - Prevent duplicate orders, Checkout Sessions, and PaymentIntents.
--
-- Manual application only:
-- 1. Review this file in Git first.
-- 2. Apply it later from the intended Supabase project's SQL Editor.
-- 3. Do not run it against Production without explicit approval.
-- 4. Before applying, confirm that no legacy orders have creator_menu_id IS NULL.
--    Such rows indicate schema drift and make the origin constraint validation
--    fail; the surrounding transaction will roll back every change.
--
-- This file is safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- 1. Add Checkout state to Creator Inquiry Quotes
-- ---------------------------------------------------------------------------

alter table public.creator_inquiry_quotes
  add column if not exists checkout_status text not null default 'not_started',
  add column if not exists checkout_attempt_count integer not null default 0,
  add column if not exists checkout_attempt_token uuid null,
  add column if not exists checkout_session_request jsonb null,
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists checkout_started_at timestamptz null,
  add column if not exists checkout_completed_at timestamptz null,
  add column if not exists checkout_last_error text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_status_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_status_check
      check (
        checkout_status in (
          'not_started',
          'creating',
          'open',
          'completed',
          'expired',
          'cancelled',
          'failed',
          'recovery_required'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_attempt_count_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_attempt_count_check
      check (checkout_attempt_count >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'creator_inquiry_quotes_checkout_request_check'
      and conrelid = 'public.creator_inquiry_quotes'::regclass
  ) then
    alter table public.creator_inquiry_quotes
      add constraint creator_inquiry_quotes_checkout_request_check
      check (
        checkout_session_request is null
        or jsonb_typeof(checkout_session_request) = 'object'
      ) not valid;
  end if;
end
$$;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_status_check;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_attempt_count_check;

alter table public.creator_inquiry_quotes
  validate constraint creator_inquiry_quotes_checkout_request_check;

-- A Stripe object must belong to only one Link quote.
create unique index if not exists creator_inquiry_quotes_checkout_session_uidx
  on public.creator_inquiry_quotes (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists creator_inquiry_quotes_payment_intent_uidx
  on public.creator_inquiry_quotes (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists creator_inquiry_quotes_attempt_token_uidx
  on public.creator_inquiry_quotes (checkout_attempt_token)
  where checkout_attempt_token is not null;

create index if not exists creator_inquiry_quotes_company_checkout_idx
  on public.creator_inquiry_quotes (
    company_user_id,
    checkout_status,
    updated_at desc
  )
  where company_user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Make public inquiry submission idempotent
-- ---------------------------------------------------------------------------

alter table public.creator_inquiries
  add column if not exists submission_id uuid null;

create unique index if not exists creator_inquiries_company_submission_uidx
  on public.creator_inquiries (company_user_id, submission_id)
  where company_user_id is not null and submission_id is not null;

create unique index if not exists creator_inquiries_anonymous_submission_uidx
  on public.creator_inquiries (link_page_id, submission_id)
  where company_user_id is null and link_page_id is not null and submission_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Add Trendre Link origin references to formal orders
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists trendre_link_inquiry_id uuid null,
  add column if not exists trendre_link_quote_id uuid null;

-- Link quotes are not created from a creator_menus row. Existing menu orders
-- keep their menu reference; only Link-origin orders may store NULL here.
alter table public.orders
  alter column creator_menu_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_inquiry_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_inquiry_id_fkey
      foreign key (trendre_link_inquiry_id)
      references public.creator_inquiries(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_quote_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_quote_id_fkey
      foreign key (trendre_link_quote_id)
      references public.creator_inquiry_quotes(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_reference_pair_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_reference_pair_check
      check (
        (
          trendre_link_inquiry_id is null
          and trendre_link_quote_id is null
        )
        or
        (
          trendre_link_inquiry_id is not null
          and trendre_link_quote_id is not null
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_trendre_link_origin_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_trendre_link_origin_check
      check (
        (
          trendre_link_quote_id is null
          and creator_menu_id is not null
        )
        or
        (
          trendre_link_quote_id is not null
          and creator_menu_id is null
        )
      ) not valid;
  end if;
end
$$;

alter table public.orders
  validate constraint orders_trendre_link_inquiry_id_fkey;

alter table public.orders
  validate constraint orders_trendre_link_quote_id_fkey;

alter table public.orders
  validate constraint orders_trendre_link_reference_pair_check;

alter table public.orders
  validate constraint orders_trendre_link_origin_check;

-- One accepted Link quote can create only one formal order.
create unique index if not exists orders_trendre_link_quote_id_uidx
  on public.orders (trendre_link_quote_id)
  where trendre_link_quote_id is not null;

create index if not exists orders_trendre_link_inquiry_id_idx
  on public.orders (trendre_link_inquiry_id)
  where trendre_link_inquiry_id is not null;

-- A retried webhook repairs the same audit event instead of adding duplicates.
alter table public.order_events
  add column if not exists dedupe_key text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_events_dedupe_key_key'
      and conrelid = 'public.order_events'::regclass
  ) then
    alter table public.order_events
      add constraint order_events_dedupe_key_key unique (dedupe_key);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_events_dedupe_key_length_check'
      and conrelid = 'public.order_events'::regclass
  ) then
    alter table public.order_events
      add constraint order_events_dedupe_key_length_check
      check (dedupe_key is null or length(dedupe_key) between 1 and 200)
      not valid;
  end if;
end
$$;

alter table public.order_events
  validate constraint order_events_dedupe_key_length_check;

-- Notification retries rely on a database-level conflict. NULL keys retain the
-- existing non-idempotent notification behavior; only explicit keys are unique
-- per recipient.
alter table public.notifications
  add column if not exists dedupe_key text null;

create unique index if not exists notifications_recipient_dedupe_key_uidx
  on public.notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

-- IF NOT EXISTS must not silently accept drifted objects. These temporary
-- assertion helpers compare catalog-level uniqueness, ordered key columns,
-- sort direction, predicates, FK targets/actions, and normalized check trees.
create or replace function pg_temp.assert_index_definition(
  index_name text,
  expected_unique boolean,
  expected_columns text[],
  expected_desc boolean[],
  expected_predicate text
) returns void language plpgsql as $$
declare
  actual_unique boolean;
  actual_columns text[];
  actual_desc boolean[];
  actual_predicate text;
begin
  select
    i.indisunique,
    array_agg(a.attname order by key_column.ordinality),
    array_agg((i.indoption[(key_column.ordinality - 1)::integer] & 1) = 1 order by key_column.ordinality),
    lower(regexp_replace(coalesce(pg_get_expr(i.indpred, i.indrelid), ''), '[[:space:]()]', '', 'g'))
  into actual_unique, actual_columns, actual_desc, actual_predicate
  from pg_index i
  join pg_class index_class on index_class.oid = i.indexrelid
  join pg_namespace index_namespace on index_namespace.oid = index_class.relnamespace
  cross join lateral unnest(i.indkey::smallint[]) with ordinality as key_column(attnum, ordinality)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = key_column.attnum
  where index_namespace.nspname = 'public'
    and index_class.relname = index_name
  group by i.indisunique, i.indpred, i.indrelid;

  if actual_unique is null
     or actual_unique is distinct from expected_unique
     or actual_columns is distinct from expected_columns
     or actual_desc is distinct from expected_desc
     or actual_predicate is distinct from expected_predicate then
    raise exception '% has an unexpected definition: unique=%, columns=%, desc=%, predicate=%',
      index_name, actual_unique, actual_columns, actual_desc, actual_predicate;
  end if;
end
$$;

create or replace function pg_temp.assert_foreign_key_definition(
  constraint_name text,
  source_table regclass,
  source_column text,
  target_table regclass,
  target_column text,
  expected_delete_action "char"
) returns void language plpgsql as $$
declare
  valid_definition boolean;
begin
  select
    c.contype = 'f'
    and c.convalidated
    and c.confrelid = target_table
    and c.confdeltype = expected_delete_action
    and source_attribute.attname = source_column
    and target_attribute.attname = target_column
  into valid_definition
  from pg_constraint c
  join pg_attribute source_attribute
    on source_attribute.attrelid = c.conrelid and source_attribute.attnum = c.conkey[1]
  join pg_attribute target_attribute
    on target_attribute.attrelid = c.confrelid and target_attribute.attnum = c.confkey[1]
  where c.conname = constraint_name
    and c.conrelid = source_table
    and array_length(c.conkey, 1) = 1
    and array_length(c.confkey, 1) = 1;

  if valid_definition is distinct from true then
    raise exception '% has an unexpected foreign-key definition', constraint_name;
  end if;
end
$$;

create or replace function pg_temp.assert_check_definition(
  constraint_name text,
  source_table regclass,
  expected_expression text
) returns void language plpgsql as $$
declare
  actual_expression text;
  is_validated boolean;
begin
  select
    lower(regexp_replace(replace(replace(pg_get_expr(c.conbin, c.conrelid), '::text[]', ''), '::text', ''), '[[:space:]()]', '', 'g')),
    c.convalidated
  into actual_expression, is_validated
  from pg_constraint c
  where c.conname = constraint_name
    and c.conrelid = source_table
    and c.contype = 'c';

  if actual_expression is distinct from expected_expression or is_validated is distinct from true then
    raise exception '% has an unexpected check definition: %', constraint_name, actual_expression;
  end if;
end
$$;

select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_checkout_session_uidx', true,
  array['stripe_checkout_session_id'], array[false],
  'stripe_checkout_session_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_payment_intent_uidx', true,
  array['stripe_payment_intent_id'], array[false],
  'stripe_payment_intent_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_attempt_token_uidx', true,
  array['checkout_attempt_token'], array[false],
  'checkout_attempt_tokenisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiry_quotes_company_checkout_idx', false,
  array['company_user_id', 'checkout_status', 'updated_at'], array[false, false, true],
  'company_user_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiries_company_submission_uidx', true,
  array['company_user_id', 'submission_id'], array[false, false],
  'company_user_idisnotnullandsubmission_idisnotnull'
);
select pg_temp.assert_index_definition(
  'creator_inquiries_anonymous_submission_uidx', true,
  array['link_page_id', 'submission_id'], array[false, false],
  'company_user_idisnullandlink_page_idisnotnullandsubmission_idisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_trendre_link_quote_id_uidx', true,
  array['trendre_link_quote_id'], array[false],
  'trendre_link_quote_idisnotnull'
);
select pg_temp.assert_index_definition(
  'orders_trendre_link_inquiry_id_idx', false,
  array['trendre_link_inquiry_id'], array[false],
  'trendre_link_inquiry_idisnotnull'
);
select pg_temp.assert_index_definition(
  'notifications_recipient_dedupe_key_uidx', true,
  array['recipient_user_id', 'dedupe_key'], array[false, false],
  'dedupe_keyisnotnull'
);
select pg_temp.assert_index_definition(
  'order_events_dedupe_key_key', true,
  array['dedupe_key'], array[false], ''
);

select pg_temp.assert_foreign_key_definition(
  'orders_trendre_link_inquiry_id_fkey', 'public.orders', 'trendre_link_inquiry_id',
  'public.creator_inquiries', 'id', 'r'
);
select pg_temp.assert_foreign_key_definition(
  'orders_trendre_link_quote_id_fkey', 'public.orders', 'trendre_link_quote_id',
  'public.creator_inquiry_quotes', 'id', 'r'
);

select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_status_check', 'public.creator_inquiry_quotes',
  'checkout_status=anyarray[''not_started'',''creating'',''open'',''completed'',''expired'',''cancelled'',''failed'',''recovery_required'']'
);
select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_attempt_count_check', 'public.creator_inquiry_quotes',
  'checkout_attempt_count>=0'
);
select pg_temp.assert_check_definition(
  'creator_inquiry_quotes_checkout_request_check', 'public.creator_inquiry_quotes',
  'checkout_session_requestisnullorjsonb_typeofcheckout_session_request=''object'''
);
select pg_temp.assert_check_definition(
  'orders_trendre_link_reference_pair_check', 'public.orders',
  'trendre_link_inquiry_idisnullandtrendre_link_quote_idisnullortrendre_link_inquiry_idisnotnullandtrendre_link_quote_idisnotnull'
);
select pg_temp.assert_check_definition(
  'orders_trendre_link_origin_check', 'public.orders',
  'trendre_link_quote_idisnullandcreator_menu_idisnotnullortrendre_link_quote_idisnotnullandcreator_menu_idisnull'
);
select pg_temp.assert_check_definition(
  'order_events_dedupe_key_length_check', 'public.order_events',
  'dedupe_keyisnullorlengthdedupe_key>=1andlengthdedupe_key<=200'
);

-- ---------------------------------------------------------------------------
-- 4. Documentation
-- ---------------------------------------------------------------------------

comment on column public.creator_inquiry_quotes.checkout_status is
  'Stripe Checkout lifecycle for an accepted Trendre Link quote.';

comment on column public.creator_inquiry_quotes.checkout_attempt_count is
  'Incremented whenever a new Stripe Checkout attempt is started.';

comment on column public.creator_inquiry_quotes.checkout_attempt_token is
  'Stable UUID used to reuse the same Stripe idempotency key after an ambiguous result.';

comment on column public.creator_inquiry_quotes.checkout_session_request is
  'Exact server-generated Stripe Checkout request reused for the active attempt.';

comment on column public.creator_inquiries.submission_id is
  'Client-generated UUID used for idempotent public Creator Link inquiry submission.';

comment on column public.creator_inquiry_quotes.stripe_checkout_session_id is
  'Stripe Checkout Session created from the accepted Trendre Link quote.';

comment on column public.creator_inquiry_quotes.stripe_payment_intent_id is
  'Stripe PaymentIntent associated with the Link quote Checkout Session.';

comment on column public.creator_inquiry_quotes.checkout_last_error is
  'Latest server-side Checkout setup error. Must not contain secrets or card data.';

comment on column public.orders.trendre_link_inquiry_id is
  'Original Trendre Link inquiry that produced this formal order.';

comment on column public.orders.trendre_link_quote_id is
  'Accepted Trendre Link quote that produced this formal order. Unique when present.';

comment on column public.orders.creator_menu_id is
  'Creator menu for menu checkout orders. NULL only for orders originating from an accepted Trendre Link quote.';

comment on column public.order_events.dedupe_key is
  'Optional idempotency key for repairable order audit events.';

comment on column public.notifications.dedupe_key is
  'Optional per-recipient idempotency key. Non-NULL values are unique for each recipient.';

commit;
