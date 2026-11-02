-- Core schema v1: currencies, profiles, accounts, categories, transactions,
-- budgets, recurring items, goals. See docs/DATA-MODEL.md.
--
-- Every user-owned table: user_id defaults to auth.uid(), RLS on, one
-- owner-only policy, nothing for anon. Composite FKs (x_id, user_id) keep
-- references inside the same user's data.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Currencies (shared reference data, read-only for users)
-- ---------------------------------------------------------------------------

create table public.currencies (
  code char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  decimals smallint not null default 2 check (decimals between 0 and 3) -- display only
);

insert into public.currencies (code, name, decimals) values
  ('IDR', 'Indonesian Rupiah', 0),
  ('USD', 'US Dollar', 2),
  ('EUR', 'Euro', 2),
  ('JPY', 'Japanese Yen', 0),
  ('CNY', 'Chinese Yuan', 2),
  ('SGD', 'Singapore Dollar', 2),
  ('MYR', 'Malaysian Ringgit', 2),
  ('SAR', 'Saudi Riyal', 2),
  ('AED', 'UAE Dirham', 2),
  ('GBP', 'British Pound', 2),
  ('AUD', 'Australian Dollar', 2),
  ('KRW', 'South Korean Won', 0),
  ('HKD', 'Hong Kong Dollar', 2),
  ('THB', 'Thai Baht', 2);

alter table public.currencies enable row level security;
revoke all on public.currencies from anon, authenticated;
grant select on public.currencies to authenticated;
create policy "Signed-in users can read currencies"
  on public.currencies for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.account_type as enum (
  'cash', 'bank', 'e_wallet', 'credit_card', 'loan',
  'investment', 'property', 'other_asset', 'other_liability'
);
create type public.category_kind as enum ('expense', 'income');
create type public.transaction_kind as enum ('regular', 'transfer', 'adjustment');
create type public.recurrence_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created by trigger)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  base_currency char(3) not null default 'IDR' references public.currencies (code),
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type public.account_type not null,
  currency char(3) not null default 'IDR' references public.currencies (code),
  opening_balance numeric(18, 2) not null default 0, -- liabilities are negative
  institution text check (char_length(institution) <= 80),
  include_in_net_worth boolean not null default true,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index accounts_user_id_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- Categories (two levels: group -> category)
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(name) between 1 and 60),
  kind public.category_kind not null,
  icon text check (char_length(icon) <= 16), -- emoji
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique nulls not distinct (user_id, parent_id, name),
  foreign key (parent_id, user_id) references public.categories (id, user_id)
    on delete set null (parent_id),
  check (parent_id is distinct from id)
);
create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_id_idx on public.categories (parent_id);

-- ---------------------------------------------------------------------------
-- Recurring items (bills, subscriptions, salary)
-- ---------------------------------------------------------------------------

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  amount numeric(18, 2) not null check (amount <> 0), -- signed: bills negative, salary positive
  account_id uuid not null,
  category_id uuid,
  frequency public.recurrence_frequency not null,
  interval_count smallint not null default 1 check (interval_count between 1 and 52),
  next_due_date date not null,
  end_date date,
  is_active boolean not null default true,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id),
  check (end_date is null or end_date >= next_due_date)
);
create index recurring_items_user_due_idx on public.recurring_items (user_id, next_due_date);
create index recurring_items_account_id_idx on public.recurring_items (account_id);
create index recurring_items_category_id_idx on public.recurring_items (category_id);

-- ---------------------------------------------------------------------------
-- Transactions (signed amounts in the account's currency)
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  kind public.transaction_kind not null default 'regular',
  amount numeric(18, 2) not null check (amount <> 0), -- in > 0, out < 0
  date date not null,
  description text check (char_length(description) <= 200), -- payee / merchant
  notes text check (char_length(notes) <= 1000),
  category_id uuid,
  transfer_id uuid, -- shared by both legs of a transfer
  recurring_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id),
  foreign key (recurring_item_id, user_id) references public.recurring_items (id, user_id)
    on delete set null (recurring_item_id),
  check (category_id is null or kind = 'regular'),
  check ((kind = 'transfer') = (transfer_id is not null))
);
create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_date_idx on public.transactions (account_id, date desc);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_transfer_id_idx on public.transactions (transfer_id);
create index transactions_recurring_item_id_idx on public.transactions (recurring_item_id);

-- ---------------------------------------------------------------------------
-- Budgets (per category per month, base currency)
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  month date not null check (extract(day from month) = 1),
  amount numeric(18, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);
create index budgets_category_id_idx on public.budgets (category_id);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_amount numeric(18, 2) not null check (target_amount > 0),
  currency char(3) not null default 'IDR' references public.currencies (code),
  target_date date,
  account_id uuid, -- if set, progress = this account's balance
  saved_amount numeric(18, 2) not null default 0 check (saved_amount >= 0), -- used when no account
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id)
    on delete set null (account_id)
);
create index goals_user_id_idx on public.goals (user_id);
create index goals_account_id_idx on public.goals (account_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recurring_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only, nothing for anon
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_items enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

revoke all on public.accounts, public.categories, public.recurring_items,
  public.transactions, public.budgets, public.goals from anon;

create policy "Users manage their own accounts" on public.accounts
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own recurring items" on public.recurring_items
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own transactions" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own budgets" on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own goals" on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Account balances view (runs with the caller's permissions, so RLS applies)
-- ---------------------------------------------------------------------------

create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance + coalesce(sum(t.amount), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

revoke all on public.account_balances from anon;

-- ---------------------------------------------------------------------------
-- New-user setup: profile + default categories
-- ---------------------------------------------------------------------------

create function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grp record;
  group_id uuid;
  child text;
  i integer;
begin
  for grp in
    select * from (values
      (1,  'expense'::public.category_kind, 'Food & Drinks', '🍜', array['Groceries', 'Eating out', 'Coffee & snacks']),
      (2,  'expense', 'Transport', '🛵', array['Fuel', 'Ride-hailing', 'Parking & tolls', 'Public transport', 'Vehicle maintenance']),
      (3,  'expense', 'Housing', '🏠', array['Rent & mortgage', 'Household supplies', 'Repairs']),
      (4,  'expense', 'Bills', '🧾', array['Electricity', 'Water', 'Internet & phone', 'Subscriptions']),
      (5,  'expense', 'Shopping', '🛍️', array['Clothing', 'Electronics', 'Home goods']),
      (6,  'expense', 'Health', '💊', array['Medical', 'Pharmacy', 'Insurance', 'Fitness']),
      (7,  'expense', 'Lifestyle', '🎉', array['Entertainment', 'Hobbies', 'Personal care', 'Travel']),
      (8,  'expense', 'Family & Giving', '🤝', array['Family support', 'Gifts', 'Donations & zakat', 'Events & weddings']),
      (9,  'expense', 'Education', '📚', array['Courses', 'Books']),
      (10, 'expense', 'Financial', '🏦', array['Bank fees', 'Taxes', 'Loan interest']),
      (11, 'income',  'Income', '💰', array['Salary', 'Bonus & THR', 'Freelance', 'Investment income', 'Other income'])
    ) as g(sort_order, kind, name, icon, children)
  loop
    insert into public.categories (user_id, name, kind, icon, sort_order)
    values (p_user_id, grp.name, grp.kind, grp.icon, grp.sort_order)
    on conflict do nothing
    returning id into group_id;

    continue when group_id is null; -- already seeded

    i := 0;
    foreach child in array grp.children loop
      i := i + 1;
      insert into public.categories (user_id, parent_id, name, kind, sort_order)
      values (p_user_id, group_id, child, grp.kind, i)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

-- These run with elevated rights; never callable through the API.
revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration.
insert into public.profiles (id) select id from auth.users on conflict do nothing;
select public.seed_default_categories(id) from auth.users;
