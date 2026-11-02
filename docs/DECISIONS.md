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
