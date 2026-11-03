<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tora: agent instructions

This is the canonical instruction file. `CLAUDE.md` only imports it. Read `docs/PROGRESS.md` first to see where things stand.

## Project summary

Tora ("tiger" in Sumatra) is an **invite-only personal finance tracker**: dashboard, accounts, transactions, cash flow, budgets, recurring items, goals, reports, insights, multi-currency and CSV import. Users are the owner now, maybe a few invited friends later; each user sees only their own data. Public sign-up is off. The owner is in Indonesia, so data entry is **manual first, CSV import later**. There's no landing page: the first screen is `/login`. Feature ideas come from Monarch Money, but **branding, UI, and copy must be original**.

More detail is in `docs/` (start at `docs/README.md`).

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 16 (App Router, TypeScript, Tailwind v4, `src/`, `@/*` → `./src/*`). Uses `proxy.ts`, not `middleware.ts`. `cacheComponents` is on. |
| UI | shadcn/ui (Radix base, `new-york` style) + official blocks; charts via shadcn charts (Recharts) |
| Backend | Supabase: Postgres, Auth, RLS, Storage (Edge Functions later). `@supabase/ssr`. No separate backend. |
| Hosting | Netlify (GitHub deploys, deploy previews) |
| Mobile (later) | Expo + React Native Reusables + NativeWind + Victory Native, same Supabase + tokens |

## Commands

```bash
npm run dev      # http://localhost:5000
npm run build    # production build + type check
npm run lint     # eslint
npm run typecheck   # next typegen (route types like PageProps) + tsc
npm test         # Vitest: unit tests + database tests (migrations + RLS in PGlite)
npx supabase start && npm run test:e2e   # Playwright E2E against the LOCAL Supabase (Docker); then: npx supabase stop
scripts/demo-data.sh seed|reset <email> --local|--linked   # fake demo data for one user / reset to a fresh account (asks to confirm for --linked)
npx shadcn@latest add <component>   # add shadcn components/blocks
npm exec -- supabase migration new <name>   # new SQL migration in supabase/migrations
npm exec -- supabase db push --linked --dry-run   # preview pending migrations
npm exec -- supabase db push --linked             # apply them to the hosted project (ask the owner first)
```

If the build fails with errors about `.next/dev/types`, run `rm -rf .next` and build again.

## Conventions

- Code lives in `src/`: routes in `src/app`, shared UI in `src/components` (`ui/` holds shadcn components), and helpers in `src/lib`.
- **Theme:** light only. Primary = logo green `#115C3B` (`oklch(0.4218 0.0896 158.83)`). Tokens live in `src/app/globals.css`. Use the tokens (`bg-primary`, `text-muted-foreground`, …), never raw hex values in components.
- The logo is `public/brand/tora-logo.png`, and the favicon is `src/app/icon.png`.
- Money: stored as `numeric(18,2)`, never floats. Default and base currency is **IDR** (confirmed); other currencies convert via `exchange_rates`.
- In Server Components, call `await connection()` (from `next/server`) before Supabase session or data calls. Supabase uses `Date.now()`, which `cacheComponents` forbids during prerendering. Read request-time data inside `<Suspense>`.
- New signed-in pages go in `src/app/(app)/<section>/` (sidebar shell) and are private by default (`proxy.ts` only lets `PUBLIC` paths through). Add nav entries in `src/components/app/nav.ts`.
- **Data:** reads go through `src/lib/data/queries.ts` (wrapped in `cache()`, call `connection()`). Writes are server actions in `src/app/(app)/<section>/actions.ts` that validate input, return `ActionState`, and call `refresh()` from `next/cache`. RLS does the authorization.
- **Tests** (keep them light): unit tests for pure helpers in `tests/unit/`; database tests in `tests/db/` run every migration in PGlite with a stubbed `auth` schema. A new table needs an RLS isolation check there. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push and PR. Browser E2E (`tests/e2e/tora.spec.ts`, one serial journey through every feature) runs locally only, against the local Supabase stack; it refuses to run against a non-local URL. Extend it when you add a feature. On WSL without Chromium system libs, unpack `libnspr4 libnss3 libasound2t64` with `apt-get download` + `dpkg-deb -x` and set `LD_LIBRARY_PATH`.
- Keep money math in pure functions in `src/lib/finance/` with unit tests; pages only fetch and render.
- **Scope:** follow `docs/DESIGN.md` (scope guard). New ideas go to the parking lot in `docs/PRD.md` unless the owner says otherwise.
- Lists are responsive rows, not tables. Check pages at 390 px wide.
- Auth flow: password → `/two-factor` (if the user has an authenticator) → app. `proxy.ts` keeps aal1 sessions with a factor on `/two-factor`.
- After each migration, run `npm run db:types` to regenerate `src/lib/supabase/database.types.ts`.
- Parse typed amounts with `parseAmount()` (Indonesian style: `1.250.000`, `10,50`).
- Show money with `formatMoney()` from `src/lib/money.ts`. Don't format numbers by hand.
- Keep the app portable. Don't use Netlify-only APIs in app code, because a move to Cloud Run is possible.
- Docs and code comments are in English.
- Keep commits small and meaningful. The default branch is `master`.

## The repo is PUBLIC

`github.com/mustafa-fathur/tora` is **public**, and its default branch is **`master`**. Anything committed, pushed, or printed in GitHub Actions logs or artifacts can be read by anyone, permanently, even after you delete it. Before every commit, check `git diff --staged` for secrets and personal data.

## Never do

- Never commit real deployment identifiers: production domain, Netlify project name, Supabase project ref, or similar. They may change, and the repo is public. Use placeholders (`<prod-domain>`, `<netlify-project>`, `<project-ref>`) in docs. In code, read them from env vars. Ask the owner for the actual values.
- Never commit real financial data: bank statements, CSV exports, `pg_dump` backups, screenshots with real balances, or seed files built from real transactions. Use clearly fake fixtures.
- Never print secrets or data in GitHub Actions (no `echo` of env vars, no dump uploaded as an artifact). Backups go to storage the owner controls, encrypted.
- Never commit `.env.local` or any real key. Only `.env.example` (placeholders) is committed.
- Never use the Supabase `service_role` / secret key in the Next.js app, on the server or the client.
- Never change the database by hand in the dashboard. Every schema change is a migration in `supabase/migrations/`.
- Never create a table without RLS enabled, an owner-only policy scoped to `auth.uid()`, **and** the restrictive `"Require 2FA when enabled"` policy using `(select public.mfa_satisfied())` (see migration `…_require_mfa_when_enrolled.sql`), plus a DB test for both.
- Never put screenshots of other products in the repo (share them by a path outside it) or copy their visual identity; see `docs/DESIGN.md`.
- Never add dark mode, a theme toggle, or remove `@custom-variant dark (&:is(.dark *))` from `globals.css`. That line keeps shadcn's `dark:` classes from following the OS setting.
- Never copy Monarch Money's design, names, copy, or assets.
- Never change the decided stack, add dependencies, design schema, or do anything costly or hard to undo without asking first.

## How the owner likes to work

- **Step by step:** for dashboard work (GitHub, Supabase, Netlify), give **one step at a time** and wait for confirmation.
- **Cite official docs:** put a link next to each setup step or non-obvious decision.
- **Use visuals:** include Mermaid diagrams when explaining how parts interact.
- **Ask before** making decisions this file and `docs/` don't cover.
- **End of every session:** update `docs/PROGRESS.md` (done, next, open questions), and add any new decision to `docs/DECISIONS.md`.
