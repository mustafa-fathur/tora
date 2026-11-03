-- Resets ONE user's data to a fresh account: deletes accounts, transactions,
-- budgets, recurring items, goals, exchange rates, categories and account types,
-- then restores the default categories and account types.
-- Keeps: the login itself (auth user, password, 2FA authenticators) and the profile.
-- Cannot be undone: dump first (supabase db dump --data-only). Run with scripts/demo-data.sh.

do $reset$
declare
  target_email text := '__TARGET_EMAIL__'; -- filled in by scripts/demo-data.sh
  uid uuid;
begin
  select id into uid from auth.users where email = target_email;
  if uid is null then
    raise exception 'No user with email %', target_email;
  end if;

  delete from public.transactions where user_id = uid;
  delete from public.recurring_items where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.goals where user_id = uid;
  delete from public.accounts where user_id = uid;
  delete from public.exchange_rates where user_id = uid;
  delete from public.categories where user_id = uid and parent_id is not null;
  delete from public.categories where user_id = uid;
  delete from public.account_types where user_id = uid;

  perform public.seed_default_categories(uid);
  perform public.seed_default_account_types(uid);

  raise notice 'Data reset for %', target_email;
end;
$reset$;
