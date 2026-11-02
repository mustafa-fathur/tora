import { byGroup, type CashflowContext, totals, type TxLike } from "@/lib/finance/cashflow";
import { formatMoney } from "@/lib/money";

export type Insight = { tone: "good" | "warning" | "neutral"; title: string; detail: string };

// Simple, explainable observations. No AI: each rule is a plain comparison.
export function insights(input: {
  ctx: CashflowContext;
  thisMonth: TxLike[]; // this month up to today
  lastMonthSamePeriod: TxLike[]; // last month, same days elapsed
  lastMonth: TxLike[]; // all of last month
  overBudget: { name: string; over: number }[];
  upcomingBills: { total: number; count: number; days: number };
  uncategorized: number;
}): Insight[] {
  const out: Insight[] = [];
  const now = totals(input.thisMonth, input.ctx);
  const before = totals(input.lastMonthSamePeriod, input.ctx);

  if (before.spending > 0 && now.spending > 0) {
    const change = (now.spending - before.spending) / before.spending;
    if (Math.abs(change) >= 0.1) {
      out.push({
        tone: change > 0 ? "warning" : "good",
        title: `Spending is ${change > 0 ? "up" : "down"} ${Math.round(Math.abs(change) * 100)}%`,
        detail: `${formatMoney(now.spending)} so far this month vs ${formatMoney(before.spending)} by this point last month.`,
      });
    }
  }

  // Biggest group increase vs the same period last month.
  const prev = new Map(byGroup(input.lastMonthSamePeriod, input.ctx).map((g) => [g.id, g.amount]));
  const jumps = byGroup(input.thisMonth, input.ctx)
    .map((g) => ({ ...g, diff: g.amount - (prev.get(g.id) ?? 0) }))
    .filter((g) => g.diff > 0 && g.id !== "uncategorized")
    .sort((a, b) => b.diff - a.diff);
  if (jumps[0] && jumps[0].diff >= Math.max(100_000, now.spending * 0.1)) {
    out.push({
      tone: "neutral",
      title: `${jumps[0].icon ?? ""} ${jumps[0].name} is your biggest increase`.trim(),
      detail: `${formatMoney(jumps[0].diff)} more than by this point last month.`,
    });
  }

  for (const b of input.overBudget.slice(0, 2)) {
    out.push({ tone: "warning", title: `Over budget: ${b.name}`, detail: `${formatMoney(b.over)} over this month's budget.` });
  }

  const last = totals(input.lastMonth, input.ctx);
  if (last.income > 0) {
    const rate = (last.income - last.spending) / last.income;
    out.push({
      tone: rate >= 0.2 ? "good" : rate >= 0 ? "neutral" : "warning",
      title: `You saved ${Math.round(rate * 100)}% of your income last month`,
      detail:
        rate >= 0.2
          ? "Nice. A common target is 20% or more."
          : rate >= 0
            ? "A common target is 20% or more."
            : "You spent more than you earned.",
    });
  }

  if (input.upcomingBills.count > 0) {
    out.push({
      tone: "neutral",
      title: `${input.upcomingBills.count} bill${input.upcomingBills.count > 1 ? "s" : ""} due in the next ${input.upcomingBills.days} days`,
      detail: `${formatMoney(input.upcomingBills.total)} in total.`,
    });
  }

  if (input.uncategorized >= 3) {
    out.push({
      tone: "neutral",
      title: `${input.uncategorized} transactions need a category`,
      detail: "Categorizing them makes budgets and reports accurate.",
    });
  }

  return out;
}
