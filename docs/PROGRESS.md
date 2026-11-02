# Progress log

Newest session at the top. Each entry has: done, next, open questions.

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
- The CLI is logged in and linked to project ref `ygzesahjkipybyxhvuik`. `supabase login` needs a real terminal; it fails with `!` in Claude Code (non-TTY).

**Next**
- Phase C is done. Next is Phase D: Netlify deploy, then add the prod and deploy-preview URLs to Supabase redirect URLs (and `site_url`).

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
