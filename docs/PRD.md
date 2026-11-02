# PRD: Tora

## Goal
A calm, trustworthy personal finance tracker that I (the only user) open every day to see where my money is and where it went.

## User
Just me, in Indonesia. Indonesian banks aren't covered by bank-sync aggregators, so all data is entered by hand or imported from CSV.

## Features (Monarch Money is the feature inspiration only; all branding, UI, and copy are original)
- **Auth:** email + password login, register, forgot/reset password.
- **Accounts:** cash, bank, e-wallet, credit card, investment; balances.
- **Transactions:** manual entry (amount, date, account, category, note); edit and delete.
- **Categories:** income and expense, editable.
- **Budgets:** monthly limit per category; spent vs. remaining.
- **Recurring items:** subscriptions, salary, bills.
- **Net worth:** assets minus liabilities over time.
- **Reports:** spending by category, cash flow per month (shadcn charts).
- **CSV import:** bank statements (later).

## Non-goals (for now)
- Bank sync / aggregators
- Multi-user, sharing, or households
- Landing page or marketing site
- Dark mode
- Separate backend service (Supabase only)

## Phases
| Phase | Scope |
|---|---|
| A | Repo docs, light green theme, first commit |
| B | GitHub repo + push (done: public, `master`) |
| C | Supabase project, Auth config, env vars, `heartbeat` table |
| D | Netlify deploy + Supabase redirect URLs |
| E | Auth UI: login, register, forgot/reset password, protected placeholder dashboard |
| Next | App shell (`dashboard-01`), schema for accounts/transactions, budgets, reports, CSV import, keep-alive + backup workflows, mobile app |
