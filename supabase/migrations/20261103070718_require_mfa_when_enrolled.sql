-- Two-factor login: once a user has a verified authenticator (TOTP factor),
-- their data is only reachable from a session that passed the code step (aal2).
-- Users without 2FA are unaffected. Pattern from
-- https://supabase.com/docs/guides/auth/auth-mfa#enforce-rules-for-mfa-logins

create function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$$;

revoke execute on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

-- Restrictive policies are AND-ed with the existing owner-only policies.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'account_types', 'categories', 'transactions',
    'budgets', 'recurring_items', 'goals', 'exchange_rates'
  ] loop
    execute format(
      'create policy "Require 2FA when enabled" on public.%I as restrictive for all to authenticated
         using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))',
      t
    );
  end loop;
end;
$$;
