import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ImportBanner } from "@/components/transactions/import-banner";
import { TransactionFilters, UNCATEGORIZED } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import { getTransactions, getTransferPartners } from "@/lib/data/queries";
import { type CashflowContext, totals } from "@/lib/finance/cashflow";
import { isMonth, monthRange, today } from "@/lib/finance/dates";
import { isUuid } from "@/lib/finance/form";
import type { Transaction } from "@/lib/finance/types";
import { MissingRatesNote, Stat } from "@/components/app/stat";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Transactions · Tora" };

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <TransactionsView searchParams={searchParams} />
    </Suspense>
  );
}

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function TransactionsView({ searchParams }: Pick<PageProps<"/transactions">, "searchParams">) {
  await connection(); // uses today's date
  const sp = await searchParams;
  const month = isMonth(param(sp.month) ?? "") ? param(sp.month)! : today().slice(0, 7);
  const account = isUuid(param(sp.account) ?? "") ? param(sp.account) : undefined;
  const rawCategory = param(sp.category);
  const uncategorized = rawCategory === UNCATEGORIZED;
  const category = uncategorized || isUuid(rawCategory ?? "") ? rawCategory : undefined;
  const importId = isUuid(param(sp.import) ?? "") ? param(sp.import) : undefined;
  const q = param(sp.q)?.slice(0, 100) || undefined;

  const { accounts, categories, groups, ctx, missingRates } = await loadFinance();
  const categoryIds = category && !uncategorized
    ? [category, ...categories.filter((c) => c.parent_id === category).map((c) => c.id)]
    : undefined;

  // Reviewing an import shows all of its rows, whatever their month.
  const { start, end } = importId ? { start: "1900-01-01", end: "9999-12-31" } : monthRange(month);
  const transactions = await getTransactions({ start, end, accountId: account, categoryIds, uncategorized, q, importId });
  const partners = await getTransferPartners(transactions);

  return (
    <>
      {importId ? (
        <ImportBanner importId={importId} count={transactions.length} />
      ) : (
        <TransactionFilters values={{ month, account, category, q }} accounts={accounts} groups={groups} />
      )}
      <MonthSummary transactions={transactions} ctx={ctx} missingRates={missingRates} />
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {importId
            ? "This import has no transactions left."
            : account || category || q
            ? "No transactions match these filters this month."
            : "No transactions this month yet. Use “Add transaction” at the top to record one."}
        </div>
      ) : (
        <TransactionList transactions={transactions} partners={partners} accounts={accounts} groups={groups} />
      )}
    </>
  );
}

// Income vs spending for the rows shown, in IDR. Transfers and balance updates
// don't count; refunds reduce spending.
function MonthSummary({ transactions, ctx, missingRates }: { transactions: Transaction[]; ctx: CashflowContext; missingRates: string[] }) {
  const { income, spending, net } = totals(transactions, ctx);
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Income" value={formatMoney(income)} />
      <Stat label="Spending" value={formatMoney(spending)} />
      <Stat label="Net" value={formatMoney(net, "IDR", { signed: true })} tone={net < 0 ? "negative" : "positive"} />
      <div className="col-span-3">
        <MissingRatesNote currencies={missingRates} />
      </div>
    </div>
  );
}
