alter table public.orders
  add column if not exists checkout_attempt_id uuid;

create unique index if not exists orders_b_user_id_checkout_attempt_id_key
  on public.orders (b_user_id, checkout_attempt_id)
  where checkout_attempt_id is not null;
