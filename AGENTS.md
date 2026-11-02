<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tora: agent instructions

This is the canonical instruction file. `CLAUDE.md` only imports it. Read `docs/PROGRESS.md` first to see where things stand.

## Project summary

Tora ("tiger" in Sumatra) is a **single-user personal finance tracker** (accounts, transactions, categories, budgets, recurring items, net worth, reports). The owner is in Indonesia, so data entry is **manual first, CSV import later**. There's no landing page: the first screen is `/login`. Feature ideas come from Monarch Money, but **branding, UI, and copy must be original**.

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
- Money: store amounts as integers in minor units, or as `numeric`. Never use floats. Default currency is IDR (not confirmed yet; ask the owner before putting it in the schema).
- Keep the app portable. Don't use Netlify-only APIs in app code, because a move to Cloud Run is possible.
- Docs and code comments are in English.
- Keep commits small and meaningful. The default branch is `master`.

## The repo is PUBLIC

`github.com/mustafa-fathur/tora` is **public**, and its default branch is **`master`**. Anything committed, pushed, or printed in GitHub Actions logs or artifacts can be read by anyone, permanently, even after you delete it. Before every commit, check `git diff --staged` for secrets and personal data.

## Never do

- Never commit real financial data: bank statements, CSV exports, `pg_dump` backups, screenshots with real balances, or seed files built from real transactions. Use clearly fake fixtures.
- Never print secrets or data in GitHub Actions (no `echo` of env vars, no dump uploaded as an artifact). Backups go to storage the owner controls, encrypted.
- Never commit `.env.local` or any real key. Only `.env.example` (placeholders) is committed.
- Never use the Supabase `service_role` / secret key in the Next.js app, on the server or the client.
- Never change the database by hand in the dashboard. Every schema change is a migration in `supabase/migrations/`.
- Never create a table without RLS enabled and policies scoped to `auth.uid()`.
- Never add dark mode, a theme toggle, or remove `@custom-variant dark (&:is(.dark *))` from `globals.css`. That line keeps shadcn's `dark:` classes from following the OS setting.
- Never copy Monarch Money's design, names, copy, or assets.
- Never change the decided stack, add dependencies, design schema, or do anything costly or hard to undo without asking first.

## How the owner likes to work

- **Step by step:** for dashboard work (GitHub, Supabase, Netlify), give **one step at a time** and wait for confirmation.
- **Cite official docs:** put a link next to each setup step or non-obvious decision.
- **Use visuals:** include Mermaid diagrams when explaining how parts interact.
- **Ask before** making decisions this file and `docs/` don't cover.
- **End of every session:** update `docs/PROGRESS.md` (done, next, open questions), and add any new decision to `docs/DECISIONS.md`.
