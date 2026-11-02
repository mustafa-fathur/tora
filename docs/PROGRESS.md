# Progress log

Newest session at the top. Each entry has: done, next, open questions.

## 2026-11-02: Session 1 (Phase A)

**Done**
- Moved the app into `src/` (`@/*` → `./src/*`) and removed the starter SVGs.
- Initialized shadcn/ui (Radix base, new-york) and added `Button`.
- Light-only theme: primary `#115C3B` sampled from the logo, all tokens on hue 158.8, no `.dark` block, `color-scheme: light`. Contrast checks: primary on white 8.0:1, muted text 5.9:1, ring 3.5:1.
- Moved the logo to `public/brand/tora-logo.png` and generated `src/app/icon.png` from it.
- Added the docs (`AGENTS.md`, `CLAUDE.md`, `docs/*`) and `.env.example`, and changed `.gitignore` so `.env.example` is committed.
- The placeholder home page shows the logo and buttons as a theme check.

**Next**
- Phase B: create the private GitHub repo, add the remote, and push.
- Phase C: Supabase project (Singapore), Auth config, env vars, and the `heartbeat` table (one row, RLS on, `anon` SELECT-only), as a migration if we adopt the Supabase CLI.
- Phase D: Netlify deploy, then add the prod and preview URLs to Supabase redirect URLs.
- Phase E: auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, confirm route), `proxy.ts`, and the placeholder `/dashboard`.
- Later: `dashboard-01` shell, schema for accounts and transactions, budgets, reports, CSV import, keep-alive and backup workflows, mobile app.

**Open questions**
- Confirm **IDR** as the default currency before designing the schema.
- After auth works: disable public sign-ups in Supabase once the owner's account exists?
- Optimize the 1.2 MB logo PNG (and add an SVG?) later.
- The chart palette is single-hue green. Categorical charts may need extra hues.
