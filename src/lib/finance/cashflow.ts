import { toBase, type Rates } from "@/lib/finance/fx";
import type { Category, CategoryKind } from "@/lib/finance/types";

// Minimal shapes so these helpers work with partial query results.
export type TxLike = {
  account_id: string;
  amount: number | string;
  date: string;
  kind: string;
  category_id: string | null;
};

export type CashflowContext = {
  currencyOf: Map<string, string>; // account id -> currency
  categoryById: Map<string, Category>;
  rates: Rates;
};

export function makeContext(
  accounts: { id: string; currency: string }[],
  categories: Category[],
  rates: Rates,
): CashflowContext {
  return {
    currencyOf: new Map(accounts.map((a) => [a.id, a.currency])),
    categoryById: new Map(categories.map((c) => [c.id, c])),
    rates,
  };
}

// Income or spending? Transfers and balance updates are neither. Uncategorized
// rows count by sign. A refund (positive, expense category) reduces spending.
export function classify(t: TxLike, ctx: CashflowContext): CategoryKind | null {
  if (t.kind !== "regular") return null;
  const category = t.category_id ? ctx.categoryById.get(t.category_id) : undefined;
  if (category) return category.kind;
  return Number(t.amount) > 0 ? "income" : "expense";
}

// Amount in IDR, or null if the currency has no rate yet.
const baseAmount = (t: TxLike, ctx: CashflowContext) =>
  toBase(Number(t.amount), ctx.currencyOf.get(t.account_id) ?? "IDR", ctx.rates);

export type Totals = { income: number; spending: number; net: number; unconverted: number };

export function totals(rows: TxLike[], ctx: CashflowContext): Totals {
  let income = 0;
  let spending = 0;
  let unconverted = 0;
  for (const t of rows) {
    const kind = classify(t, ctx);
    if (!kind) continue;
    const v = baseAmount(t, ctx);
    if (v === null) {
      unconverted++;
      continue;
    }
    if (kind === "income") income += v;
    else spending -= v;
  }
  return { income: round(income), spending: round(spending), net: round(income - spending), unconverted };
}

// Totals per month, oldest first. `months` are "YYYY-MM".
export function byMonth(rows: TxLike[], ctx: CashflowContext, months: string[]) {
  const buckets = new Map(months.map((m) => [m, [] as TxLike[]]));
  for (const t of rows) buckets.get(t.date.slice(0, 7))?.push(t);
  return months.map((month) => ({ month, ...totals(buckets.get(month)!, ctx) }));
}

export type CategoryTotal = { id: string; name: string; icon: string | null; amount: number };

// Spending (or income) per category group, largest first. Uncategorized rows
// are grouped under id "uncategorized".
export function byGroup(rows: TxLike[], ctx: CashflowContext, kind: CategoryKind = "expense"): CategoryTotal[] {
  const sums = new Map<string, CategoryTotal>();
  for (const t of rows) {
    if (classify(t, ctx) !== kind) continue;
    const v = baseAmount(t, ctx);
    if (v === null) continue;
    const category = t.category_id ? ctx.categoryById.get(t.category_id) : undefined;
    const group = category?.parent_id ? ctx.categoryById.get(category.parent_id) : category;
    const key = group?.id ?? "uncategorized";
    const entry = sums.get(key) ?? { id: key, name: group?.name ?? "Uncategorized", icon: group?.icon ?? null, amount: 0 };
    entry.amount += kind === "expense" ? -v : v;
    sums.set(key, entry);
  }
  return [...sums.values()]
    .map((e) => ({ ...e, amount: round(e.amount) }))
    .filter((e) => e.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

// Net spending per category id (expense categories only), for budgets.
export function spendingByCategory(rows: TxLike[], ctx: CashflowContext) {
  const sums = new Map<string, number>();
  for (const t of rows) {
    if (classify(t, ctx) !== "expense" || !t.category_id) continue;
    const v = baseAmount(t, ctx);
    if (v === null) continue;
    sums.set(t.category_id, (sums.get(t.category_id) ?? 0) - v);
  }
  return sums;
}

export const round = (n: number) => Math.round(n * 100) / 100;
