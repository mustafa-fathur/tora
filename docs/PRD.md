# PRD: Tora

## Goal
A calm, trustworthy personal finance tracker that I (the only user) open every day to see where my money is and where it went.

## Users
Me, in Indonesia. Later, possibly **a few invited friends** (invite-only, each sees only their own data through RLS). Public sign-up is off. Indonesian banks aren't covered by bank-sync aggregators, so all data is entered by hand or imported from CSV.

## Features (Monarch Money is the feature inspiration only; all branding, UI, and copy are original)
| Area | Scope |
|---|---|
| Auth | Email + password, forgot/reset. Invite-only. ✅ |
| Accounts | Cash, bank, e-wallet, credit card, loan, investment, property, other. Per-account currency. Archive. |
| Transactions | Manual entry, edit, delete, search/filter. Transfers between accounts. Refunds. Balance adjustments. |
| Categories | Two levels (group → category), editable defaults for Indonesia. |
| Dashboard | Net worth, this month's cash flow, budget status, upcoming bills, recent transactions. |
| Cash flow | Income vs spending per month, by category. |
| Budgets | Monthly limit per category or group, spent vs. remaining, copy from last month. |
| Recurring | Bills, subscriptions, salary: upcoming list, "mark paid" creates the transaction. |
| Goals | Target and date, progress from a linked account or a manual amount. |
| Investments | Investment accounts with manual value updates (v1). Holdings and prices later. |
| Reports | Spending by category, trends over time, net worth history (shadcn charts). |
| Insights | Rule-based observations (e.g. spending up X% vs. last month). AI advice is optional and last. |
| Currencies | 14 curated currencies, IDR default; formatting via `Intl.NumberFormat`. Conversion to IDR in a later phase. |
| CSV import | Bank statement import with column mapping and duplicate detection (later). |

## Non-goals (for now)
- Bank sync / aggregators
- Public sign-up, sharing between users, or households
- Landing page or marketing site
- Dark mode
- Separate backend service (Supabase only)

## Phases
| Phase | Scope | Status |
|---|---|---|
| A–E | Docs, theme, GitHub, Supabase, Netlify, auth | ✅ |
| F | Schema v1, app shell, money formatting | ✅ |
| G | Accounts, account types, categories, transactions (time, transfers, refunds) | ✅ |
| I | Dashboard, cash flow, budgets | ✅ (built ahead of H at the owner's request) |
| J | Recurring items (mark paid / skip), goals | ✅ |
| K | Reports (net worth history, trends), rule-based insights | ✅ |
| L | Currency conversion (manual or fetched rates) | ✅; investment holdings: later |
| M | CSV import (column mapping, duplicates, undo, learned categories) | ✅ |
| N (part) | Installable PWA (manifest + icons) | ✅ |
| **H** | **Ops: private `tora-ops` repo with keep-alive + encrypted nightly backups** | ⏳ **next, before relying on Tora daily** |
| N (rest) | Custom SMTP + friend invites, optional AI advice | later |
| Later | Native mobile app (Expo), offline support | |
