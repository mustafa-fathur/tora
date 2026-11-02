# Use cases

## UC1: Get an account (invite-only)
1. Public sign-up is off. `/register` only says "Tora is invite-only".
2. I invite someone from Supabase → Authentication → Users → **Invite user**.
3. *(Not built yet; needs custom SMTP.)* They click the invite link, which goes to `/auth/confirm?type=invite`, then set a password on a "set password" page, and land on `/dashboard`.

## UC2: Log in
1. I open any URL while signed out, and the proxy redirects me to `/login`.
2. I enter my email and password.
3. On success, I go to `/dashboard`. On failure, I see a clear error (wrong credentials, or email not confirmed).

## UC3: Forgot / reset password
1. On `/login`, I click "Forgot password?", which goes to `/forgot-password`.
2. I enter my email, and the app always shows "If that email exists, a link was sent".
3. The link opens the confirm route, which then sends me to `/reset-password`.
4. I set a new password and land on `/dashboard`.

## UC4: Log out
1. On `/dashboard`, I click "Log out". The session is cleared, and I'm back on `/login`.

## UC5: Add a transaction (later)
1. I click "Add transaction".
2. I choose the account, type (expense/income/transfer), amount (IDR), date, category, and an optional note.
3. I save. The account balance and budget progress update.

## UC6: Set a monthly budget (later)
1. I open Budgets and choose a month.
2. I set a limit per category.
3. I see spent vs. remaining, and categories that go over the limit are highlighted.

## UC7: Import a bank CSV (later)
1. I upload a statement CSV and map its columns (date, description, amount).
2. I preview the rows, skip duplicates, and assign an account.
3. I confirm, and the transactions are created.
