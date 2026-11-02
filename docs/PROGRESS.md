# Progress log

Newest session at the top. Each entry has: done, next, open questions.

## ▶ Start here (state at end of 2026-11-02)

**Phases A–E are done.** The repo is public (`master`). Netlify deploys on push to a custom domain. Supabase (Singapore) has email + password auth with **sign-ups off**, a confirmed owner account, and the `heartbeat` table. Auth UI is live: login (with show-password), forgot/reset password, invite-only `/register`, placeholder `/dashboard`, protected by `proxy.ts`.

**Next**: follow the phases in `docs/PRD.md`. Currently **Phase F**:
1. ✅ Schema v1 (`20261102143959_core_schema.sql`) tested in PGlite, then **applied** with the owner's approval. Hosted DB: 1 profile, 51 default categories, 14 currencies. Anon gets 401 on all user tables and the view.
2. ✅ App shell: shadcn sidebar (collapsible, mobile sheet), header with page title, user email + log out in the sidebar footer, "coming soon" pages for every section. `proxy.ts` is default-deny. `formatMoney()` helper.
3. ⏳ The owner checks the shell locally and on production.
4. Next: **Phase G**: accounts CRUD, categories in Settings, transactions (add/edit/delete, transfers, filters).

**Open questions**
- ✅ IDR is the default; 14 curated currencies (see DECISIONS).
- Backup destination for Phase H (private repo artifacts vs. Google Drive vs. R2): decide then.
- Optimize the 1.2 MB logo PNG (and add an SVG?).
- The chart palette is single-hue green; categorical charts may need extra hues.

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
