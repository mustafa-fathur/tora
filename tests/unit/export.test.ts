import { describe, expect, it } from "vitest";

import { toCsv, transactionRows } from "@/lib/finance/export";
import type { Account, Category, Transaction } from "@/lib/finance/types";

describe("toCsv", () => {
  it("quotes, escapes and neutralizes formulas", () => {
    const csv = toCsv([
      ["a,b", 'say "hi"', "=HYPERLINK(1)", "-cmd", 1500.5, -45000, null],
    ]);
    expect(csv).toBe('﻿"a,b","say ""hi""",\'=HYPERLINK(1),\'-cmd,1500.5,-45000,\r\n');
  });
});

describe("transactionRows", () => {
  const account = { id: "a", name: "BCA", currency: "IDR" } as Account;
  const cat = (id: string, name: string, kind: "expense" | "income", parent_id: string | null) =>
    ({ id, name, kind, parent_id }) as Category;
  const categories = [cat("food", "Food & Drinks", "expense", null), cat("eat", "Eating out", "expense", "food"), cat("sal", "Salary", "income", "inc")];
  const tx = (p: Partial<Transaction>) =>
    ({ id: "t", account_id: "a", kind: "regular", amount: -45000, date: "2026-11-03", time: "12:30:00", category_id: null, description: null, notes: null, ...p }) as Transaction;

  it("labels types and splits group and category", () => {
    const rows = transactionRows(
      [
        tx({ category_id: "eat", description: "Lunch" }),
        tx({ category_id: "eat", amount: 10000 }),
        tx({ category_id: "sal", amount: 5000000, time: null }),
        tx({ kind: "transfer", amount: -1 }),
        tx({ kind: "adjustment", amount: 5 }),
      ],
      [account],
      categories,
    );
    expect(rows.map((r) => r[4])).toEqual(["Expense", "Refund", "Income", "Transfer", "Balance update"]);
    expect(rows[0]).toEqual(["2026-11-03", "12:30", "BCA", "IDR", "Expense", "Food & Drinks", "Eating out", "Lunch", "", -45000]);
    expect(rows[2][1]).toBe("");
  });
});
