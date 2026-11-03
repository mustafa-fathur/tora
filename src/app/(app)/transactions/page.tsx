import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { MissingRatesNote, shortMoney, Stat } from "@/components/app/stat";
import { ImportBanner } from "@/components/transactions/import-banner";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { type SummaryNumbers, TransactionSummary } from "@/components/transactions/transaction-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import { getTransactions, getTransferPartners } from "@/lib/data/queries";
import { filtersQuery, parseTransactionParams } from "@/lib/data/transaction-filters";
import { dailyTotals } from "@/lib/finance/calendar";
import { type CashflowContext, classify, totals } from "@/lib/finance/cashflow";
import { today } from "@/lib/finance/dates";
import { toBase } from "@/lib/finance/fx";
import type { Transaction } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Transactions · Tora" };

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <TransactionsView searchParams={searchParams} />
    </Suspense>
  );
}

async function TransactionsView({ searchParams }: Pick<PageProps<"/transactions">, "searchParams">) {
  await connection(); // uses today's date
  const sp = await searchParams;
  const { accounts, categories, groups, ctx, missingRates } = await loadFinance();
  const { month, account, category, q, importId, filters } = parseTransactionParams(sp, categories, today());

  const transactions = await getTransactions(filters);
  const partners = await getTransferPartners(transactions);
  const summary = summarize(transactions, ctx);
  const exportHref = `/export/transactions?${filtersQuery({ month, account, category, q, importId })}`;
  const dayNet = Object.fromEntries(
    Object.entries(dailyTotals(transactions, ctx)).map(([d, t]) => [d, t.income - t.spending]),
  );

  return (
    <>
      {importId ? (
        <ImportBanner importId={importId} count={transactions.length} />
      ) : (
        <TransactionFilters
          values={{ month, account, category, q }}
          accounts={accounts}
          groups={groups}
          exportHref={exportHref}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Phones and tablets: compact totals above the list. */}
          <div className="grid grid-cols-3 gap-3 lg:hidden">
            <Stat label="Income" value={formatMoney(summary.income)} short={shortMoney(summary.income)} />
            <Stat label="Spending" value={formatMoney(summary.spending)} short={shortMoney(summary.spending)} />
            <Stat
              label="Net"
              value={formatMoney(summary.net, "IDR", { signed: true })}
              short={shortMoney(summary.net, true)}
              tone={summary.net < 0 ? "negative" : "positive"}
            />
          </div>
          <MissingRatesNote currencies={missingRates} />
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              {importId
                ? "This import has no transactions left."
                : account || category || q
                  ? "No transactions match these filters this month."
                  : "No transactions this month yet. Use “Add transaction” at the top to record one."}
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              partners={partners}
              accounts={accounts}
              groups={groups}
              dayTotals={dayNet}
            />
          )}
        </div>
        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <TransactionSummary s={summary} exportHref={exportHref} />
        </aside>
      </div>
    </>
  );
}

// Totals in IDR for the rows shown. Transfers and balance updates don't count; refunds reduce spending.
function summarize(rows: Transaction[], ctx: CashflowContext): SummaryNumbers {
  const { income, spending, net } = totals(rows, ctx);
  let largest: SummaryNumbers["largest"] = null;
  let expenses = 0;
  for (const t of rows) {
    if (classify(t, ctx) !== "expense") continue;
    const v = toBase(Number(t.amount), ctx.currencyOf.get(t.account_id) ?? "IDR", ctx.rates);
    if (v === null || v >= 0) continue;
    expenses++;
    if (!largest || -v > largest.amount) {
      const category = t.category_id ? ctx.categoryById.get(t.category_id) : undefined;
      largest = { label: t.description || category?.name || "Uncategorized", amount: -v };
    }
  }
  return { count: rows.length, income, spending, net, largest, averageExpense: expenses ? spending / expenses : null };
}
