-- 1. Account types become user-managed (Settings → Account types).
--    Each type has a class that drives behavior:
--      cash       → "Cash & bank"            (asset)
--      investment → "Investments & property" (asset)
--      liability  → "Debts"                  (balances stored negative)
-- 2. Optional time of day on transactions, for ordering within a day.

create type public.account_class as enum ('cash', 'investment', 'liability');

create table public.account_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  class public.account_class not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);
create index account_types_user_id_idx on public.account_types (user_id);

create trigger set_updated_at before update on public.account_types
  for each row execute function public.set_updated_at();

alter table public.account_types enable row level security;
revoke all on public.account_types from anon;
create policy "Users manage their own account types" on public.account_types
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.seed_default_account_types(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_types (user_id, name, class, sort_order)
  values
    (p_user_id, 'Cash', 'cash', 1),
    (p_user_id, 'Bank account', 'cash', 2),
    (p_user_id, 'E-wallet', 'cash', 3),
    (p_user_id, 'Investment', 'investment', 4),
    (p_user_id, 'Property', 'investment', 5),
    (p_user_id, 'Other asset', 'investment', 6),
    (p_user_id, 'Credit card', 'liability', 7),
    (p_user_id, 'Paylater', 'liability', 8),
    (p_user_id, 'Loan', 'liability', 9),
    (p_user_id, 'Other liability', 'liability', 10)
  on conflict (user_id, name) do nothing;
end;
$$;
revoke execute on function public.seed_default_account_types(uuid) from public, anon, authenticated;

-- New users also get default account types.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  perform public.seed_default_categories(new.id);
  perform public.seed_default_account_types(new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

select public.seed_default_account_types(id) from auth.users;

-- Move accounts from the old enum to the new table.
alter table public.accounts add column type_id uuid;

update public.accounts a
set type_id = t.id
from public.account_types t
where t.user_id = a.user_id
  and t.name = case a.type
    when 'cash' then 'Cash'
    when 'bank' then 'Bank account'
    when 'e_wallet' then 'E-wallet'
    when 'investment' then 'Investment'
    when 'property' then 'Property'
    when 'other_asset' then 'Other asset'
    when 'credit_card' then 'Credit card'
    when 'loan' then 'Loan'
    when 'other_liability' then 'Other liability'
  end;

alter table public.accounts alter column type_id set not null;
alter table public.accounts
  add foreign key (type_id, user_id) references public.account_types (id, user_id)
  on delete restrict; -- a type in use can't be deleted
create index accounts_type_id_idx on public.accounts (type_id);

alter table public.accounts drop column type;
drop type public.account_type;

-- Time of day (optional).
alter table public.transactions add column time time(0);
drop index public.transactions_user_date_idx;
create index transactions_user_date_idx
  on public.transactions (user_id, date desc, time desc nulls last);
