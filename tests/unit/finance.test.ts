import { describe, expect, it } from "vitest";

import { budgetLines, budgetSummary } from "@/lib/finance/budgets";
import { byGroup, byMonth, makeContext, spendingByCategory, totals, type TxLike } from "@/lib/finance/cashflow";
import { sumInBase, toBase } from "@/lib/finance/fx";
import { netWorthHistory } from "@/lib/finance/networth";
import { describeFrequency, nextDate, occurrences } from "@/lib/finance/recurring";
import type { Category, CategoryGroup } from "@/lib/finance/types";

const cat = (id: string, name: string, kind: "expense" | "income", parent_id: string | null = null): Category => ({
  id, name, kind, parent_id, icon: parent_id ? null : "🍜", user_id: "u", is_archived: false,
  sort_order: 0, created_at: "", updated_at: "",
});
const food = cat("food", "Food", "expense");
const groceries = cat("groceries", "Groceries", "expense", "food");
const eatingOut = cat("eating", "Eating out", "expense", "food");
const transport = cat("transport", "Transport", "expense");
const salary = cat("salary", "Salary", "income");
const categories = [food, groceries, eatingOut, transport, salary];
const accounts = [
  { id: "bca", currency: "IDR" },
  { id: "wise", currency: "USD" },
];
const ctx = makeContext(accounts, categories, { USD: 16000 });

const tx = (p: Partial<TxLike>): TxLike => ({
  account_id: "bca", amount: -10000, date: "2026-11-05", kind: "regular", category_id: null, ...p,
});

describe("fx", () => {
  it("converts to IDR and reports missing rates", () => {
    expect(toBase(10, "USD", { USD: 16000 })).toBe(160000);
    expect(toBase(10, "EUR", {})).toBeNull();
    expect(sumInBase([{ amount: 100, currency: "IDR" }, { amount: 1, currency: "EUR" }], {})).toEqual({
      total: 100,
      missing: ["EUR"],
    });
  });
});

describe("cash flow", () => {
  const rows = [
    tx({ amount: 5000000, category_id: "salary" }),
    tx({ amount: -200000, category_id: "groceries" }),
    tx({ amount: 50000, category_id: "groceries" }), // refund
    tx({ amount: -100000, category_id: "eating" }),
    tx({ amount: -10, account_id: "wise", category_id: "transport" }), // US$10 = 160k
    tx({ amount: -300000, kind: "transfer" }), // ignored
    tx({ amount: 999, kind: "adjustment" }), // ignored
    tx({ amount: -25000 }), // uncategorized spending
  ];

  it("totals income and spending, ignoring transfers and adjustments", () => {
    expect(totals(rows, ctx)).toEqual({ income: 5000000, spending: 435000, net: 4565000, unconverted: 0 });
  });

  it("groups spending by category group, refunds included", () => {
    expect(byGroup(rows, ctx).map((g) => [g.name, g.amount])).toEqual([
      ["Food", 250000],
      ["Transport", 160000],
      ["Uncategorized", 25000],
    ]);
  });

  it("counts rows it can't convert", () => {
    const noRates = makeContext(accounts, categories, {});
    expect(totals(rows, noRates).unconverted).toBe(1);
  });

  it("splits by month", () => {
    const res = byMonth([tx({ date: "2026-10-31" }), tx({ date: "2026-11-01" })], ctx, ["2026-10", "2026-11"]);
    expect(res.map((m) => m.spending)).toEqual([10000, 10000]);
  });
});

describe("budgets", () => {
  const groups: CategoryGroup[] = [
    { ...food, children: [groceries, eatingOut] },
    { ...transport, children: [] },
  ];
  const spending = spendingByCategory(
    [tx({ amount: -900000, category_id: "groceries" }), tx({ amount: -300000, category_id: "eating" }), tx({ amount: -50000, category_id: "transport" })],
    ctx,
  );

  it("rolls category budgets up to the group and flags status", () => {
    const lines = budgetLines(groups, new Map([["groceries", 1000000], ["eating", 200000]]), spending);
    const foodLine = lines[0];
    expect(foodLine.total).toMatchObject({ budget: 1200000, spent: 1200000, remaining: 0, status: "warning" });
    expect(foodLine.children.map((c) => c.status)).toEqual(["warning", "over"]);
    expect(lines[1].total.budget).toBeNull();
    expect(budgetSummary(lines)).toEqual({ budget: 1200000, spent: 1250000, unbudgeted: 50000 });
  });

  it("prefers a group's own budget", () => {
    const lines = budgetLines(groups, new Map([["food", 2000000], ["groceries", 1000000]]), spending);
    expect(lines[0]).toMatchObject({ ownBudget: true, total: { budget: 2000000, status: "ok" } });
  });
});

describe("recurring dates", () => {
  it("advances by frequency and keeps month-end bills sane", () => {
    expect(nextDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextDate("2026-02-28", "monthly", 1, 31)).toBe("2026-03-31");
    expect(nextDate("2026-11-02", "weekly", 2)).toBe("2026-11-16");
    expect(nextDate("2028-02-29", "yearly")).toBe("2029-02-28");
    expect(nextDate("2026-12-15", "monthly", 3)).toBe("2027-03-15");
  });

  it("lists upcoming occurrences until a date or end date", () => {
    const item = { next_due_date: "2026-11-30", frequency: "monthly" as const, interval_count: 1, end_date: null };
    expect(occurrences(item, "2027-02-28")).toEqual(["2026-11-30", "2026-12-30", "2027-01-30", "2027-02-28"]);
    expect(occurrences({ ...item, end_date: "2026-12-31" }, "2027-12-31")).toHaveLength(2);
  });

  it("describes frequencies", () => {
    expect(describeFrequency("monthly", 1)).toBe("Monthly");
    expect(describeFrequency("weekly", 2)).toBe("Every 2 weeks");
  });
});

describe("net worth history", () => {
  it("adds opening balances and transactions up to each month end", () => {
    const accts = [
      { id: "bca", currency: "IDR", opening_balance: 1000, include_in_net_worth: true, created_at: "2026-10-03T00:00:00Z" },
      { id: "card", currency: "IDR", opening_balance: -500, include_in_net_worth: true, created_at: "2026-11-01T00:00:00Z" },
      { id: "hidden", currency: "IDR", opening_balance: 9999, include_in_net_worth: false, created_at: "2026-09-01T00:00:00Z" },
      { id: "usd", currency: "USD", opening_balance: 1, include_in_net_worth: true, created_at: "2026-11-01T00:00:00Z" },
    ];
    const rows = [
      { account_id: "bca", date: "2026-10-20", amount: -200 },
      { account_id: "bca", date: "2026-11-10", amount: 300 },
    ];
    expect(netWorthHistory(accts, rows, ["2026-09", "2026-10", "2026-11"], { USD: 16000 })).toEqual([
      { month: "2026-09", netWorth: 0 },
      { month: "2026-10", netWorth: 800 },
      { month: "2026-11", netWorth: 1100 - 500 + 16000 },
    ]);
  });
});

describe("monthsUntil", async () => {
  const { monthsUntil, monthlyEquivalent } = await import("@/lib/finance/recurring");
  it("counts whole months, at least one for future dates", () => {
    expect(monthsUntil("2026-11-02", "2027-11-02")).toBe(12);
    expect(monthsUntil("2026-11-02", "2026-11-20")).toBe(1);
    expect(monthsUntil("2026-11-02", "2026-10-01")).toBe(0);
  });
  it("normalizes recurring amounts to a month", () => {
    expect(monthlyEquivalent(-1200000, "yearly", 1)).toBe(-100000);
    expect(monthlyEquivalent(-100000, "monthly", 2)).toBe(-50000);
  });
});
