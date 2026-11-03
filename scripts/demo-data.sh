#!/usr/bin/env bash
# Seed demo data into, or reset, ONE user's account.
#
#   scripts/demo-data.sh seed  <email> --local    # local Supabase (npx supabase start)
#   scripts/demo-data.sh reset <email> --linked   # the hosted project (asks to confirm)
#
# seed:  ~6 months of made-up transactions, accounts, budgets, recurring items, goals.
#        Refuses if the user already has accounts.
# reset: back to a fresh account (keeps the login, 2FA and profile). Can't be undone.
set -euo pipefail

usage() { sed -n '2,10p' "$0"; exit 1; }
[ $# -eq 3 ] || usage
action=$1 email=$2 target=$3

case "$action" in
  seed) sql=supabase/scripts/demo-seed.sql ;;
  reset) sql=supabase/scripts/reset-user-data.sql ;;
  *) usage ;;
esac
case "$target" in --local | --linked) ;; *) usage ;; esac
[[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || { echo "That doesn't look like an email." >&2; exit 1; }

if [ "$target" = --linked ]; then
  read -r -p "This will $action data for $email in the HOSTED project. Type the email again to confirm: " confirm
  [ "$confirm" = "$email" ] || { echo "Cancelled." >&2; exit 1; }
fi

cd "$(dirname "$0")/.."
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
sed "s/__TARGET_EMAIL__/$email/" "$sql" > "$tmp"
out=$(npx supabase db query "$target" --file "$tmp" 2>&1) || { echo "$out" >&2; exit 1; }
if grep -q '"_tag":"Error"' <<<"$out"; then echo "$out" >&2; exit 1; fi
echo "Done. $email now has:"
npx supabase db query "$target" "
  select (select count(*) from public.accounts where user_id = u.id) as accounts,
         (select count(*) from public.transactions where user_id = u.id) as transactions,
         (select count(*) from public.recurring_items where user_id = u.id) as recurring,
         (select count(*) from public.goals where user_id = u.id) as goals,
         (select count(*) from public.categories where user_id = u.id) as categories
  from auth.users u where u.email = '$email'" -o table 2>/dev/null || true
