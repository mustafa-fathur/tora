# Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-11-02 | Next.js (App Router, TS, Tailwind, `src/`) for web | Owner's choice; one framework for UI and server code |
| 2026-11-02 | shadcn/ui (Radix base) + official blocks; shadcn charts (Recharts) | Owned, editable components; blocks speed up auth and dashboard UI |
| 2026-11-02 | Supabase (Postgres, Auth, RLS, Storage) with no separate backend | Less to run; RLS gives per-user security without an API layer |
| 2026-11-02 | Netlify hosting, not Vercel | Owner's choice; no Netlify-only APIs in app code to keep a Cloud Run move possible |
| 2026-11-02 | ~~Private GitHub repo~~ (superseded below) | GitHub disables scheduled workflows in public repos after 60 days without activity |
| 2026-11-02 | Plan: keep-alive cron reads `public.heartbeat` + nightly `pg_dump` | Free tier pauses after 7 days of low activity and has no automatic backups |
| 2026-11-02 | Manual entry first, CSV import later | Aggregators don't cover Indonesian banks |
| 2026-11-02 | Light theme only; primary `#115C3B` sampled from the logo | Calm, consistent money app; the `dark` variant is bound to a `.dark` class that's never used |
| 2026-11-02 | Moved app into `src/`, alias `@/*` → `./src/*` | Matches the planned structure; the repo was still empty |
| 2026-11-02 | shadcn init with Radix base, `new-york` style, neutral base color recolored green | Most blocks target Radix; the theme is overridden with Tora tokens |
| 2026-11-02 | Mobile later with Expo + RN Reusables + NativeWind + Victory Native | Reuses the Supabase backend and design tokens |
| 2026-11-02 | **Repo is public**, default branch `master` (owner's choice, supersedes "private") | Owner is fine with the code being public. Consequences: no secrets or real financial data in git or Actions logs/artifacts; secret scanning + push protection on; keep-alive cron needs a plan for the 60-day rule (see PROGRESS open questions) |
| 2026-11-02 | Local dev port **5000** (`next dev -p 5000`; `start` uses `$PORT`, falling back to 5000); Supabase Site URL + redirect allow `http://localhost:5000` | Other apps (incl. other Next.js apps) often hold 3000 |
| 2026-11-02 | Supabase CLI (dev dependency) + SQL migrations in `supabase/migrations/` | Schema is versioned and reviewable in git; migrations contain only schema, so they're safe in a public repo |
| 2026-11-02 | Auth via server actions + `useActionState` (no browser Supabase client yet) | Auth logic stays on the server; forms work without client-side Supabase; pending and error states come for free |
| 2026-11-02 | Email links use `token_hash` templates → `/auth/confirm` (PKCE `code` also handled) | Works even if the link is opened on another device or browser; recommended by the Supabase SSR guide |
| 2026-11-02 | Signed-in/out redirects live in `proxy.ts`; pages read the session only inside `<Suspense>` | Required by `cacheComponents`; keeps auth pages static |
| 2026-11-02 | Public sign-ups **off**; Tora is invite-only. `/register` shows an "invite-only" notice; sign-up form and action removed (they remain in git history) | Only the owner (and later a few friends) should have accounts; invites via the Supabase dashboard |
| 2026-11-02 | Show/hide toggle on password fields (login, reset) | Owner wants to check what they typed |
| 2026-11-02 | Default currency **IDR**; 14 curated currencies in a `currencies` table; per-account currency | Formatting is free via `Intl.NumberFormat`; conversion needs FX rates, so a short list keeps that phase manageable |
| 2026-11-02 | Money as `numeric(18,2)`, signed amounts (in > 0, out < 0), liabilities negative | Exact decimals, and balance = opening + sum; refunds and credit cards work without special cases |
| 2026-11-02 | Scope: all Monarch-style areas; investments = manual valuations first; advice = rule-based insights first, AI optional and last | Covers daily needs without price feeds or paid AI APIs |
| 2026-11-02 | Composite FKs `(x_id, user_id)` on all cross-table references | Stops rows from pointing at another user's data, alongside RLS |
| 2026-11-02 | Keep-alive + backups in a separate **private** `tora-ops` repo (Phase H, before real data piles up) | Avoids the 60-day public-repo cron rule; backup logs stay private |
| 2026-11-02 | Custom SMTP and friend invites moved to the last phase | The owner's own email works with Supabase's built-in email |
| 2026-11-02 | `proxy.ts` is default-deny: only `PUBLIC` paths work without a session | New pages are private automatically |
| 2026-11-02 | App shell = shadcn `sidebar` only (not the full dashboard-01 block); collapsible to icons, sheet on mobile | Lean; charts and tables are added when a feature needs them |
| 2026-11-02 | Money display uses the `id-ID` number style (Rp 1.250.000, US$10,50) with English UI copy | Familiar separators for an Indonesian user |
| 2026-11-02 | Top bar = sidebar toggle + page title + **global** actions (e.g. "Add transaction", from Phase G). Page-specific controls (month picker, filters, "Add account") sit in a header row inside the page content | One quick-add button reachable from everywhere; page controls stay next to the content they change |
| 2026-11-02 | Account types are a user-managed table with a fixed **class** (cash / investment / liability) instead of an enum | The owner wants to add types (Paylater, Deposito…); the class keeps the debt sign and grouping correct |
| 2026-11-02 | Optional `time` on transactions, defaulting to the current time on entry | Orders spending within a day without making the time mandatory |
| 2026-11-02 | Testing: Vitest unit tests + PGlite database tests + GitHub Actions CI (lint, typecheck, test, build). No E2E yet | Catches money-math and RLS regressions cheaply; light enough for a one-person project |
| 2026-11-02 | Before data-changing migrations, dump the hosted data locally (`supabase db dump --data-only`, outside the repo) | No automatic backups on the free tier until Phase H |
| 2026-11-03 | Built phases I–M (and the PWA part of N) before H, at the owner's request | Owner wanted all features first; backups (H) are the top remaining item |
| 2026-11-03 | Exchange rates: user-scoped latest rate per currency; manual or fetched from open.er-api.com (free, no key) | Simple and covers all 14 currencies (incl. SAR/AED); historical rates not needed yet |
| 2026-11-03 | Money logic lives in pure functions in `src/lib/finance/*` (cash flow, budgets, recurring, net worth, insights, CSV) | Unit-testable without a browser or database |
| 2026-11-03 | E2E: Playwright against the **local** Supabase stack (Docker), one serial journey spec, run locally with `npm run test:e2e` (not in CI) | Real end-to-end confidence without touching the hosted project or adding CI complexity |
| 2026-11-03 | Insights are rule-based (spending pace vs last month, biggest increase, over budget, savings rate, upcoming bills, uncategorized) | Useful "advice" with no AI cost or data leaving Supabase |
| 2026-11-03 | Semantic chart colors: income = brand green, spending = warm coral (`--chart-income`, `--chart-expense`) | Money in vs out must be distinguishable at a glance |
| 2026-11-03 | Polish round P with a fixed 7-item scope, then a 2-week use period | Owner asked for a clear scope to tame perfectionism |
| 2026-11-03 | Screenshots of Monarch are reference only, kept outside the repo; borrow generic patterns, never visual identity or wording (`docs/DESIGN.md`) | Avoid any plagiarism allegation, especially in a public repo |
| 2026-11-03 | Calendar page (month/week/day, Monday-start, spending heat tint, upcoming bills from Recurring) | Not in Monarch; glanceable daily view the owner asked for |
| 2026-11-03 | Two-factor login via Supabase TOTP; enforced in `proxy.ts` and in the DB (restrictive RLS on aal2 when a verified factor exists) | Money app; DB enforcement holds even if app code has a bug. No backup codes in Supabase, so the UI suggests a second authenticator |
| 2026-11-03 | Exports: CSV of the current transaction view (`/export/transactions`) and everything as JSON (`/export/all`), formula-injection-safe CSV | The owner's own copy of their data; not a substitute for backups |
| 2026-11-03 | Typecheck runs `next typegen` first | Fresh CI checkouts don't have generated `PageProps`/`LayoutProps` |
| 2026-11-03 | Backups: private `tora-ops` repo, nightly `supabase db dump` (schema + `auth`/`public` data) encrypted with **age** (public key in GitHub, private key only with the owner), stored as workflow artifacts for 90 days; keep-alive reads `heartbeat` every 3 days | No extra service or cost; encrypted at rest; private repo avoids the 60-day schedule rule |
| 2026-11-03 | Restore skips `roles.sql` and the data dump excludes Supabase-managed schemas (storage etc.) | Found in a local restore test: both need superuser rights; Tora has no custom roles and doesn't use Storage |
