import { round } from "@/lib/finance/cashflow";
import type { CategoryGroup } from "@/lib/finance/types";

export type BudgetStatus = "ok" | "warning" | "over";

export type BudgetLine = {
  categoryId: string;
  budget: number | null; // null = no budget set
  spent: number;
  remaining: number | null;
  ratio: number | null; // spent / budget
  status: BudgetStatus | null;
};

export const WARNING_RATIO = 0.8;

export function status(spent: number, budget: number): BudgetStatus {
  if (spent > budget) return "over";
  if (budget > 0 && spent / budget >= WARNING_RATIO) return "warning";
  return "ok";
}

function line(categoryId: string, budget: number | null, spent: number): BudgetLine {
  spent = round(spent);
  if (budget === null) return { categoryId, budget, spent, remaining: null, ratio: null, status: null };
  return {
    categoryId,
    budget,
    spent,
    remaining: round(budget - spent),
    ratio: budget > 0 ? spent / budget : spent > 0 ? Infinity : 0,
    status: status(spent, budget),
  };
}

// Budget vs spending for each expense group and its categories.
// A group's spending includes its categories (and anything filed on the group itself).
// If a group has no budget of its own, its budget is the sum of its categories' budgets.
export function budgetLines(
  groups: CategoryGroup[],
  budgets: Map<string, number>, // category id -> amount for the month
  spending: Map<string, number>, // category id -> spent
) {
  return groups
    .filter((g) => g.kind === "expense")
    .map((g) => {
      const children = g.children.map((c) => line(c.id, budgets.get(c.id) ?? null, spending.get(c.id) ?? 0));
      const spent = (spending.get(g.id) ?? 0) + children.reduce((s, c) => s + c.spent, 0);
      const childBudgets = children.filter((c) => c.budget !== null);
      const own = budgets.get(g.id);
      const budget =
        own !== undefined ? own : childBudgets.length ? childBudgets.reduce((s, c) => s + c.budget!, 0) : null;
      return { group: g, total: line(g.id, budget, spent), ownBudget: own !== undefined, children };
    });
}

// Overall: sum of group budgets vs all expense spending.
export function budgetSummary(lines: ReturnType<typeof budgetLines>) {
  const budgeted = lines.filter((l) => l.total.budget !== null);
  const budget = budgeted.reduce((s, l) => s + l.total.budget!, 0);
  const spent = lines.reduce((s, l) => s + l.total.spent, 0);
  const spentInBudgeted = budgeted.reduce((s, l) => s + l.total.spent, 0);
  return { budget: round(budget), spent: round(spent), unbudgeted: round(spent - spentInBudgeted) };
}
