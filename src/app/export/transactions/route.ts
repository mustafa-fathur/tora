import type { NextRequest } from "next/server";

import { getAccounts, getAllTransactions, getCategories } from "@/lib/data/queries";
import { parseTransactionParams } from "@/lib/data/transaction-filters";
import { today } from "@/lib/finance/dates";
import { toCsv, TRANSACTION_CSV_HEADER, transactionRows } from "@/lib/finance/export";

// CSV of the transactions matching the same filters as /transactions
// (?month=&account=&category=&q=&import=), or every transaction with ?all=1.
// proxy.ts requires a session; RLS limits rows to the signed-in user.
export async function GET(request: NextRequest) {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { month, all, importId, filters } = parseTransactionParams(params, categories, today());
  const transactions = await getAllTransactions(filters);

  const csv = toCsv([TRANSACTION_CSV_HEADER, ...transactionRows(transactions, accounts, categories)]);
  const name = all ? `tora-transactions-all-${today()}` : importId ? `tora-import-${importId.slice(0, 8)}` : `tora-transactions-${month}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
