# Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-11-02 | Next.js (App Router, TS, Tailwind, `src/`) for web | Owner's choice; one framework for UI and server code |
| 2026-11-02 | shadcn/ui (Radix base) + official blocks; shadcn charts (Recharts) | Owned, editable components; blocks speed up auth and dashboard UI |
| 2026-11-02 | Supabase (Postgres, Auth, RLS, Storage) with no separate backend | Less to run; RLS gives per-user security without an API layer |
| 2026-11-02 | Netlify hosting, not Vercel | Owner's choice; no Netlify-only APIs in app code to keep a Cloud Run move possible |
| 2026-11-02 | Private GitHub repo | GitHub disables scheduled workflows in public repos after 60 days without activity; keep-alive/backup crons need to keep running |
| 2026-11-02 | Plan: keep-alive cron reads `public.heartbeat` + nightly `pg_dump` | Free tier pauses after 7 days of low activity and has no automatic backups |
| 2026-11-02 | Manual entry first, CSV import later | Aggregators don't cover Indonesian banks |
| 2026-11-02 | Light theme only; primary `#115C3B` sampled from the logo | Calm, consistent money app; the `dark` variant is bound to a `.dark` class that's never used |
| 2026-11-02 | Moved app into `src/`, alias `@/*` → `./src/*` | Matches the planned structure; the repo was still empty |
| 2026-11-02 | shadcn init with Radix base, `new-york` style, neutral base color recolored green | Most blocks target Radix; the theme is overridden with Tora tokens |
| 2026-11-02 | Mobile later with Expo + RN Reusables + NativeWind + Victory Native | Reuses the Supabase backend and design tokens |
