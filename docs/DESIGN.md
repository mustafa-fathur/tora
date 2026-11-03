# Design notes

## Inspired, not copied
Monarch Money is the feature inspiration. Reference screenshots stay in `reference/`, which is **gitignored and never published**.

| Borrow (generic patterns) | Never borrow (their identity) |
|---|---|
| Transactions grouped by day, with a day total | Their colors (orange), logo, illustrations, icons |
| A summary panel next to a list | Uppercase small-caps stat labels, their exact page layouts |
| Net worth trend line, monthly cash-flow bars | The Sankey cash-flow diagram, their donut + legend grid |
| CSV export, budgets, recurring, goals as features | Their wording: "Advice", "Edit rules", "Refresh all", "Everything else"… |

Tora's own choices: the tiger logo and forest green (`#115C3B`), Indonesian number style (`Rp 1.250.000`, `45 rb`), a grouped sidebar (Overview · Money · Planning · Insights), a **calendar** with upcoming bills, an owned-vs-owed bar, and rule-based insights.

## Layout
- **Lists of rows, not tables.** Rows reflow on phones and map 1:1 to the future mobile app. (Reports' month-by-month table is the one exception.)
- Top bar: page title + global "Add transaction". Page-specific controls live in the page.
- Phone first check: every page at 390 px wide, no horizontal scroll; long amounts switch to the short form (`Rp 4,6 jt`) on narrow phones.
- Light theme only; semantic chart colors: income green, spending coral.

## Scope guard
To finish things instead of polishing forever:
1. Each round has a fixed list, agreed before work starts (see `PRD.md` → Phases).
2. A new idea during a round goes to the **parking lot** in `PRD.md`, unless it fixes a bug or blocks daily use.
3. A round ends with tests passing and a **2-week use period** before the next round.
