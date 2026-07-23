-- Creator-side quotes for inquiries received from the public Link form.
-- One current quote per inquiry. Re-sending updates the existing row.

create table if not exists public.creator_inquiry_quotes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references public.creator_inquiries(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  company_user_id uuid null references auth.users(id) on delete set null,
  contact_email text not null,
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'declined', 'expired', 'cancelled')),
  currency text not null default 'JPY',
  quoted_amount integer not null check (quoted_amount >= 1000),
  buyer_plan_code_snapshot text not null default 'free',
  buyer_marketplace_fee_rate_bps integer not null default 1000,
  buyer_marketplace_fee_amount integer not null default 0,
  creator_transaction_fee_rate_bps integer not null default 1500,
  creator_transaction_fee_amount integer not null default 0,
  buyer_total_amount integer not null,
  creator_payout_amount integer not null,
  platform_gross_revenue_amount integer not null default 0,
  scope text not null,
  delivery_text text null,
  note text null,
  valid_until timestamptz not null,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz null,
  declined_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_inquiry_quotes_creator_status_idx
  on public.creator_inquiry_quotes (creator_user_id, status, updated_at desc);

create index if not exists creator_inquiry_quotes_company_status_idx
  on public.creator_inquiry_quotes (company_user_id, status, updated_at desc)
  where company_user_id is not null;

alter table public.creator_inquiry_quotes enable row level security;

comment on table public.creator_inquiry_quotes is
  'Quotes sent by creators for inquiries received through the public Link form. Accessed through trusted server routes.';
