import { loadFinance } from "@/lib/data/finance";
import { getBudgets, getRecurringItems, getTransactionsBetween } from "@/lib/data/queries";
import { budgetLines } from "@/lib/finance/budgets";
import { spendingByCategory } from "@/lib/finance/cashflow";
import { monthRange, shiftMonth, today } from "@/lib/finance/dates";
import { toBase } from "@/lib/finance/fx";
import { insights } from "@/lib/finance/insights";
import { addDays, occurrences } from "@/lib/finance/recurring";

// This month vs last month, budgets, upcoming bills and insights.
// Shared by the dashboard and reports. Call at request time.
export async function loadOverview() {
  const finance = await loadFinance();
  const todayIso = today();
  const month = todayIso.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const day = Number(todayIso.slice(8, 10));

  const [rows, budgets, recurring] = await Promise.all([
    getTransactionsBetween(monthRange(prevMonth).start, monthRange(month).end),
    getBudgets(month),
    getRecurringItems(),
  ]);
  const thisMonth = rows.filter((r) => r.date.startsWith(month) && r.date <= todayIso);
  const lastMonth = rows.filter((r) => r.date.startsWith(prevMonth));
  const lastMonthSamePeriod = lastMonth.filter((r) => Number(r.date.slice(8, 10)) <= day);

  const lines = budgetLines(finance.groups, budgets, spendingByCategory(thisMonth, finance.ctx));
  const overBudget = lines
    .filter((l) => l.total.status === "over")
    .map((l) => ({ name: l.group.name, over: -(l.total.remaining ?? 0) }));

  const horizon = 14;
  const until = addDays(todayIso, horizon);
  const upcoming = recurring
    .filter((r) => r.is_active)
    .flatMap((r) =>
      occurrences(r, until, 5)
        .filter((d) => d >= todayIso || d === r.next_due_date)
        .map((date) => ({ item: r, date })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const currencyOf = new Map(finance.accounts.map((a) => [a.id, a.currency]));
  const bills = upcoming.filter((u) => Number(u.item.amount) < 0);
  const billsTotal = bills.reduce(
    (s, u) => s - (toBase(Number(u.item.amount), currencyOf.get(u.item.account_id) ?? "IDR", finance.rates) ?? 0),
    0,
  );

  const uncategorized = thisMonth.filter((r) => r.kind === "regular" && !r.category_id).length;

  return {
    ...finance,
    todayIso,
    month,
    thisMonth,
    lines,
    upcoming,
    insights: insights({
      ctx: finance.ctx,
      thisMonth,
      lastMonthSamePeriod,
      lastMonth,
      overBudget,
      upcomingBills: { total: billsTotal, count: bills.length, days: horizon },
      uncategorized,
    }),
  };
}
