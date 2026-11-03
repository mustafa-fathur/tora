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
| A–G | Docs, theme, GitHub, Supabase, Netlify, auth, schema, shell, accounts, transactions | ✅ |
| I–M | Dashboard, cash flow, budgets, recurring, goals, reports, insights, FX, CSV import, PWA | ✅ |
| **P** (polish) | Calendar (month/week/day + upcoming bills), transaction day totals + summary panel + CSV export, accounts net worth trend + section totals + owned-vs-owed bar, data export (CSV/JSON), two-factor login (authenticator app), logo 1.2 MB → 28 KB, grouped sidebar | ✅ → **2-week use period** |
| H | Ops: private `tora-ops` repo, keep-alive + encrypted nightly backups | deferred by the owner (reminder: free tier has no backups) |
| N | Custom SMTP + friend invites | deferred |

## Future (owner's plans, not scheduled)
1. **Native mobile app** (Expo) on the same Supabase backend.
2. **Capture from bank emails:** a Gmail filter auto-forwards bank notification emails to an inbound address (e.g. Cloudflare Email Routing) → parsed into "to review" transactions. Reading Gmail directly via the Gmail API is possible for personal use but is a restricted scope (weekly re-auth in testing mode).
3. **Capture by chat text** ("Kopi Kenangan 19k" → Rp 19.000, now): in-app chat box first, then a Telegram bot (free Bot API + webhook), WhatsApp later (Meta WhatsApp Cloud API: business account + dedicated number), and an MCP server so an AI assistant can add/query transactions.

## Parking lot (ideas, not planned)
Sankey/donut charts · bulk edit · auto-categorization rules · per-account sparklines · tags · attachments · split transactions.

## Not wanted (for now)
Investment holdings (the owner uses a dedicated investing app) · historical exchange rates · AI advice · offline mode.
