# Progress log

Newest session at the top. Each entry has: done, next, open questions.

## ▶ Start here (state at end of 2026-11-03, session 3)

**Polish round P is done** (scope in `docs/PRD.md`). We're now in the owner's **2-week use period**: fix bugs the owner reports, don't start new features. Hosted DB has 5 migrations. Tests: 75 unit/database tests (`npm test`, in CI) + 22 browser E2E steps (`npm run test:e2e`, local Supabase).

**Owner to-do**
1. Supabase dashboard → Authentication → Multi-Factor: make sure **TOTP (authenticator app)** is enabled, then turn on 2FA in Tora → Settings → Security.
2. Use Tora daily for 2 weeks; note anything odd.

**Deferred by the owner:** SMTP + invites. **Done:** Phase H backups + keep-alive (see session 3c).

**Future plans:** see `docs/PRD.md` → Future (mobile app, email capture, chat capture, MCP).

## 2026-11-03: Session 3c (Phase H: backups)
- Demo data cleared from the owner's account; owner turned on 2FA (1 authenticator; a second one is recommended).
- `~/projects/tora-ops` (separate private repo, not pushed yet): `.github/workflows/ops.yml` (keep-alive every 3 days, nightly encrypted backup → artifacts, 90 days) + README with the restore guide.
- Restore tested locally: dump → encrypt → decrypt → restore into an empty Supabase → identical counts, balances, logins and policies.
- ✅ Owner set up the private `tora-ops` repo, age key (private key in the owner's password manager + `~/.config/tora/backup-key.txt`), secrets and `AGE_RECIPIENT`. First manual run: keep-alive ✅, backup ✅ (artifact kept 90 days). Owner decrypted it with their key: `roles.sql`, `schema.sql`, `data.sql` present. **Phase H done.**
- Schedules: backup daily 02:00 WIB, keep-alive every 3 days. GitHub emails the owner if a run fails. Restore guide: `tora-ops/README.md`.

## 2026-11-03: Session 3b (demo data)
- `scripts/demo-data.sh` + `supabase/scripts/demo-seed.sql` (≈6 months of fake Indonesian finance: 8 accounts incl. USD, credit card, paylater, investment; ~580 transactions; budgets with over/warning months; 10 recurring items incl. one overdue; 3 goals) and `supabase/scripts/reset-user-data.sql` (back to a fresh account; keeps login, 2FA, profile).
- Tested on the local stack: seed → realistic balances (no negative bank/wallet) → screenshots of every page, no browser errors → reset → seed again.

## 2026-11-03: Session 3 (polish round P)

**Done**
- CI fix (`next typegen` before `tsc`; 60 s DB-test setup timeout).
- `docs/DESIGN.md` (borrow-vs-own rules, layout, scope guard). Reference screenshots were temporary and never committed.
- Calendar page (month/week/day, today tint, spending heat, upcoming/overdue bills, "add on this day").
- Transactions: day totals, summary panel (wide screens), CSV export; phones use short amounts (`Rp 4,6 jt`).
- Accounts: net worth overview (change over 3/6/12 months, owned-vs-owed bar, trend chart), section totals; net worth now counts archived accounts the same way as the dashboard.
- Settings → Data: all transactions (CSV), everything (JSON).
- Two-factor login: Settings → Security (QR + setup key), `/two-factor` step, proxy + DB enforcement (migration `20261103070718`, applied after a local data dump).
- Logo 1.2 MB → 28 KB. Sidebar grouped (Overview · Money · Planning · Insights).
- Tests: +calendar/export/compact-money unit tests, 2FA DB test, E2E for calendar, exports, accounts overview, sidebar, and real TOTP 2FA (22/22). Visual check at 1366 px and 390 px.

## 2026-11-03: Session 2 (phases I–M)

**Done**
- Migration `20261102164321_exchange_rates_and_imports.sql` (exchange_rates table, transactions.import_id), tested locally, then applied after a local data dump.
- **Dashboard:** net worth, this month's income/spending/net, net worth chart, insights, budgets, upcoming bills, spending by category, recent transactions, goals.
- **Cash flow:** 12-month income vs spending chart, savings rate, income/spending by category (links to filtered transactions).
- **Budgets:** per group or category per month, roll-up, ok/warning/over status, copy last month, quiet categories folded away.
- **Recurring:** add/edit, mark paid (creates the transaction, advances the date), skip, pause, monthly fixed-cost estimate.
- **Goals:** manual (add/take out money) or linked to an account balance; months-to-target saving suggestion.
- **Reports:** 3/6/12 months: net worth history, spending by category, month-by-month table, insights.
- **Exchange rates** (Settings): manual or "Fetch today's rates"; all totals convert foreign accounts.
- **CSV import:** column guessing (English + Indonesian), date/amount formats (DB/CR, both number styles), preview, duplicate skipping, categories learned from past descriptions, review + undo. "Uncategorized" filter on Transactions.
- **PWA:** manifest + icons (Add to Home Screen).
- **CI fix:** `npm run typecheck` now runs `next typegen` first (fresh checkouts have no generated `PageProps`/`LayoutProps`), and DB test setup gets a 60s timeout for cold runners. Verified with the full CI sequence in a clean clone (`npm ci` → lint → typecheck → test → build).
- Tests: unit tests for all money logic and CSV parsing; DB tests for the new tables; Playwright E2E journey on the local Supabase stack (16/16 passing, no browser errors). Visual check by screenshots (desktop + 390px phone); fixed a dialog overflow on phones and noisy budget rows.

## 2026-11-02: Session 1c (Phase E, auth)

**Done**
- Phase D finished: Supabase Site URL = production, and redirect URLs cover localhost:5000, production, and Netlify deploy previews.
- Added `@supabase/supabase-js` + `@supabase/ssr`, and the shadcn `login-03`/`signup-03` blocks (restyled, with Tora logo and copy).
- Pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, and `/dashboard` (placeholder with log out). Route handler: `/auth/confirm`.
- States: loading buttons, wrong password, unconfirmed email (with a resend button), "check your inbox", password mismatch or too short, rate limits, network errors, and invalid or expired links.
- Verified locally (production build): signed-out redirects, bad link → `/login?error=link_invalid`, `//evil.com` in `next` is blocked, forms render server-side, and Supabase returns `invalid_credentials` for a wrong password. A headless browser test wasn't possible (system libraries missing in WSL).

**Next**
- Email: **default Supabase email + default templates for now** (owner's choice). Links use the PKCE `code` flow, so they must be opened in the same browser that started the sign-up or reset. Later: set up custom SMTP (Resend suggested, sending from the owner's domain) and then switch templates to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email|recovery`.
- ✅ Owner tested locally (port 5000): register → "check inbox" → confirm link → /dashboard → log out. The owner's account now exists.
- ✅ Forgot → reset password tested locally by the owner.
- ✅ Public sign-ups disabled in Supabase. `/register` is now an invite-only notice; the sign-up form and `register` action are removed.
- Added a show/hide password toggle (login + reset).
- Fixed the "Blocking Route: Date.now() while prerendering" warning on `/dashboard` with `await connection()`.
- **Invites for friends (later):** needs (1) custom SMTP, because built-in email only reaches project team members, (2) an Invite template with `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite`, or a `/auth/confirm` change to handle the default invite link, and (3) a "set your password" step after the invite link (reuse `/reset-password`).
- ✅ Production tested by the owner: redirects, login with password toggle, dashboard without warnings, log out, invite-only `/register`. **Phase E is done.**
- Then: `dashboard-01` shell, and confirm IDR before the schema.

## 2026-11-02: Session 1b (Phase B)

**Done**
- The owner created `github.com/mustafa-fathur/tora` as **public** with default branch **`master`**, and pushed (HEAD `064a8e9`).
- Scanned the full history for secrets: clean. Secret scanning and push protection are enabled on the repo.
- Wrote the public-repo rules into `AGENTS.md`, added `.gitignore` guards for backups, dumps, and data folders, and updated DECISIONS and ARCHITECTURE.

- Phase C: the owner created Supabase project `tora` (Singapore, free plan) and turned on email + password auth (confirm email on, secure email change on, min password length 10).
- Switched local dev to port **5000**.
- Set Supabase Site URL `http://localhost:5000` and redirect URL `http://localhost:5000/**`. `.env.local` is filled in and verified against `/auth/v1/settings` (HTTP 200, confirmations required).
- Added the Supabase CLI and ran `supabase init`. `config.toml` auth settings are aligned with the dashboard (port 5000, min password length 10, confirmations on).
- Migration `20261102090116_create_heartbeat.sql`: one-row table, RLS on, `anon` SELECT only. **Applied** to the hosted project. Verified with the publishable key: read 200, insert/update/delete 401 (`42501`), and the row is unchanged.
- The CLI is logged in and linked to the hosted project. `supabase login` needs a real terminal; it fails with `!` in Claude Code (non-TTY).

- Phase D: the owner imported the repo into Netlify (branch `master`, `npm run build`, publish `.next`, the two `NEXT_PUBLIC_*` env vars not marked secret). The first deploy succeeded, and production runs on a custom domain. Actual domain and project name are intentionally not recorded here (see AGENTS.md).

**Next**
- Phase D: add `https://<prod-domain>/**` and `https://deploy-preview-*--<netlify-project>.netlify.app/**` to Supabase redirect URLs, and set Site URL to production.

**Open questions**
- **Keep-alive vs. the 60-day rule:** GitHub disables scheduled workflows in public repos after 60 days without repo activity. Options: (a) put the cron workflows in a small separate **private** repo, (b) re-enable the workflow manually when GitHub emails a warning, (c) use an external cron service. Decide before building the keep-alive job.

## 2026-11-02: Session 1 (Phase A)

**Done**
- Moved the app into `src/` (`@/*` → `./src/*`) and removed the starter SVGs.
- Initialized shadcn/ui (Radix base, new-york) and added `Button`.
- Light-only theme: primary `#115C3B` sampled from the logo, all tokens on hue 158.8, no `.dark` block, `color-scheme: light`. Contrast checks: primary on white 8.0:1, muted text 5.9:1, ring 3.5:1.
- Moved the logo to `public/brand/tora-logo.png` and generated `src/app/icon.png` from it.
- Added the docs (`AGENTS.md`, `CLAUDE.md`, `docs/*`) and `.env.example`, and changed `.gitignore` so `.env.example` is committed.
- The placeholder home page shows the logo and buttons as a theme check.

**Next**
- Phase C: Supabase project (Singapore), Auth config, env vars, and the `heartbeat` table (one row, RLS on, `anon` SELECT-only), as a migration if we adopt the Supabase CLI.
- Phase D: Netlify deploy, then add the prod and preview URLs to Supabase redirect URLs.
- Phase E: auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, confirm route), `proxy.ts`, and the placeholder `/dashboard`.
- Later: `dashboard-01` shell, schema for accounts and transactions, budgets, reports, CSV import, keep-alive and backup workflows, mobile app.

**Open questions**
- Confirm **IDR** as the default currency before designing the schema.
- After auth works: disable public sign-ups in Supabase once the owner's account exists?
- Optimize the 1.2 MB logo PNG (and add an SVG?) later.
- The chart palette is single-hue green. Categorical charts may need extra hues.
