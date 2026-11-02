-- 1. Exchange rates: what 1 unit of a foreign currency is worth in the base
--    currency (IDR). One latest rate per currency per user; entered by hand or
--    fetched from a public rates API by the app.
-- 2. import_id on transactions: groups rows created by one CSV import, so an
--    import can be reviewed or undone as a whole.

create table public.exchange_rates (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  currency char(3) not null references public.currencies (code) check (currency <> 'IDR'),
  rate numeric(20, 8) not null check (rate > 0), -- 1 currency = rate IDR
  source text not null default 'manual' check (source in ('manual', 'api')),
  updated_at timestamptz not null default now(),
  primary key (user_id, currency)
);

create trigger set_updated_at before update on public.exchange_rates
  for each row execute function public.set_updated_at();

alter table public.exchange_rates enable row level security;
revoke all on public.exchange_rates from anon;
create policy "Users manage their own exchange rates" on public.exchange_rates
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.transactions add column import_id uuid;
create index transactions_import_id_idx on public.transactions (import_id) where import_id is not null;
