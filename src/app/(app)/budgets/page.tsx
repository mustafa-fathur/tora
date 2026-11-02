import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { MonthSwitcher } from "@/components/app/month-switcher";
import { Meter, MissingRatesNote, Stat } from "@/components/app/stat";
import { CopyBudgetsButton, SetBudgetDialog } from "@/components/budgets/budget-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import { getBudgets, getTransactionsBetween } from "@/lib/data/queries";
import { type BudgetLine, budgetLines, budgetSummary } from "@/lib/finance/budgets";
import { spendingByCategory } from "@/lib/finance/cashflow";
import { isMonth, monthRange, today } from "@/lib/finance/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Budgets · Tora" };

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <BudgetsView searchParams={searchParams} />
    </Suspense>
  );
}

async function BudgetsView({ searchParams }: Pick<PageProps<"/budgets">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const month = typeof sp.month === "string" && isMonth(sp.month) ? sp.month : today().slice(0, 7);
  const { start, end } = monthRange(month);
  const [{ groups, ctx, missingRates }, budgets, rows] = await Promise.all([
    loadFinance(),
    getBudgets(month),
    getTransactionsBetween(start, end),
  ]);
  const lines = budgetLines(groups, budgets, spendingByCategory(rows, ctx));
  const summary = budgetSummary(lines);
  const left = summary.budget - (summary.spent - summary.unbudgeted);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={month} />
        {budgets.size === 0 && <CopyBudgetsButton month={month} />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Budgeted" value={formatMoney(summary.budget)} />
        <Stat label="Spent in budgets" value={formatMoney(summary.spent - summary.unbudgeted)} />
        <Stat label="Left" value={formatMoney(left)} tone={left < 0 ? "negative" : "positive"} />
        <Stat label="Spent outside budgets" value={formatMoney(summary.unbudgeted)} />
      </div>
      <MissingRatesNote currencies={missingRates} />
      {budgets.size === 0 && (
        <p className="text-sm text-muted-foreground">
          No budgets for this month yet. Tap the pencil next to a group or category to set one, or
          copy last month&apos;s.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {lines.map(({ group, total, ownBudget, children }) => (
          <section key={group.id} className="rounded-xl border bg-card" aria-label={group.name}>
            <div className="flex flex-col gap-2 border-b px-4 py-3">
              <BudgetRow
                name={`${group.icon ?? ""} ${group.name}`.trim()}
                line={total}
                month={month}
                editableBudget={ownBudget || children.every((c) => c.budget === null) ? total.budget : null}
                note={!ownBudget && total.budget !== null ? "Sum of category budgets" : undefined}
                strong
              />
            </div>
            <CategoryRows group={group} lines={children} month={month} />
          </section>
        ))}
      </div>
    </>
  );
}

function BudgetRow({
  name,
  line,
  month,
  editableBudget,
  note,
  strong,
}: {
  name: string;
  line: BudgetLine;
  month: string;
  editableBudget: number | null;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("flex-1 truncate", strong ? "font-medium" : "text-sm")}>{name}</span>
        <span className="text-sm tabular-nums">
          {formatMoney(line.spent)}
          {line.budget !== null && <span className="text-muted-foreground"> / {formatMoney(line.budget)}</span>}
        </span>
        <SetBudgetDialog
          categoryId={line.categoryId}
          name={name}
          month={month}
          current={editableBudget}
          spent={line.spent}
          trigger={
            <Button variant="ghost" size="icon" className="size-7" aria-label={`Set budget for ${name}`}>
              <Pencil className="size-3.5" />
            </Button>
          }
        />
      </div>
      {line.budget !== null && (
        <>
          <Meter ratio={line.ratio ?? 0} status={line.status} />
          <span
            className={cn(
              "text-xs",
              line.status === "over" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {line.remaining! >= 0
              ? `${formatMoney(line.remaining!)} left`
              : `${formatMoney(-line.remaining!)} over`}
            {note && ` · ${note}`}
          </span>
        </>
      )}
    </div>
  );
}

// Categories with a budget or spending are listed; quiet ones are tucked away.
function CategoryRows({
  group,
  lines,
  month,
}: {
  group: { children: { id: string; name: string }[] };
  lines: BudgetLine[];
  month: string;
}) {
  const name = (id: string) => group.children.find((x) => x.id === id)!.name;
  const active = lines.filter((c) => c.budget !== null || c.spent !== 0);
  const quiet = lines.filter((c) => !active.includes(c));
  const row = (c: BudgetLine) => (
    <li key={c.categoryId} className="px-4 py-2.5">
      <BudgetRow name={name(c.categoryId)} line={c} month={month} editableBudget={c.budget} />
    </li>
  );
  return (
    <>
      {active.length > 0 && <ul className="divide-y">{active.map(row)}</ul>}
      {quiet.length > 0 && (
        <details className="group border-t">
          <summary className="cursor-pointer px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
            {quiet.length} {active.length ? "more " : ""}categor{quiet.length === 1 ? "y" : "ies"} without a budget
          </summary>
          <ul className="divide-y border-t">{quiet.map(row)}</ul>
        </details>
      )}
    </>
  );
}
