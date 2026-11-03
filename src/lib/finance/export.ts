import type { Account, Category, Transaction } from "@/lib/finance/types";

// Builds CSV text. Text cells that start with = + - @ (or tab/CR) are prefixed with
// an apostrophe so spreadsheet apps don't run them as formulas (CSV injection).
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  // BOM so Excel opens UTF-8 (Rp, emoji) correctly.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export const TRANSACTION_CSV_HEADER = [
  "Date", "Time", "Account", "Currency", "Type", "Group", "Category", "Description", "Notes", "Amount",
];

export function transactionRows(transactions: Transaction[], accounts: Account[], categories: Category[]) {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return transactions.map((t) => {
    const account = accountById.get(t.account_id);
    const category = t.category_id ? categoryById.get(t.category_id) : undefined;
    const group = category?.parent_id ? categoryById.get(category.parent_id) : category;
    const amount = Number(t.amount);
    const type =
      t.kind === "transfer"
        ? "Transfer"
        : t.kind === "adjustment"
          ? "Balance update"
          : category?.kind === "income" || (!category && amount > 0)
            ? "Income"
            : amount > 0
              ? "Refund"
              : "Expense";
    return [
      t.date,
      t.time?.slice(0, 5) ?? "",
      account?.name ?? "",
      account?.currency ?? "",
      type,
      group?.name ?? "",
      category && category.parent_id ? category.name : "",
      t.description ?? "",
      t.notes ?? "",
      amount, // plain number, "." decimal, no thousands separators
    ];
  });
}
