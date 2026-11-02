import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAccounts,
  getCategories,
  getTransactions,
  getTransferPartners,
  toCategoryGroups,
} from "@/lib/data/queries";
import { isMonth, monthRange, today } from "@/lib/finance/dates";
import { isUuid } from "@/lib/finance/form";
import type { Category, Transaction } from "@/lib/finance/types";
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
  const category = isUuid(param(sp.category) ?? "") ? param(sp.category) : undefined;
  const q = param(sp.q)?.slice(0, 100) || undefined;

  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  const groups = toCategoryGroups(categories);
  const categoryIds = category
    ? [category, ...categories.filter((c) => c.parent_id === category).map((c) => c.id)]
    : undefined;

  const { start, end } = monthRange(month);
  const transactions = await getTransactions({ start, end, accountId: account, categoryIds, q });
  const partners = await getTransferPartners(transactions);

  return (
    <>
      <TransactionFilters values={{ month, account, category, q }} accounts={accounts} groups={groups} />
      <MonthSummary transactions={transactions} categories={categories} accounts={accounts} />
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {account || category || q
            ? "No transactions match these filters this month."
            : "No transactions this month yet. Use “Add transaction” at the top to record one."}
        </div>
      ) : (
        <TransactionList transactions={transactions} partners={partners} accounts={accounts} groups={groups} />
      )}
    </>
  );
}

// Income vs spending for the rows shown (IDR only until currency conversion).
// Transfers and balance updates don't count; refunds reduce spending.
function MonthSummary({
  transactions,
  categories,
  accounts,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: { id: string; currency: string }[];
}) {
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  let income = 0;
  let spending = 0;
  let skipped = 0;
  for (const t of transactions) {
    if (t.kind !== "regular") continue;
    if (currencyOf.get(t.account_id) !== "IDR") {
      skipped++;
      continue;
    }
    const amount = Number(t.amount);
    const kind = t.category_id ? kindOf.get(t.category_id) : amount > 0 ? "income" : "expense";
    if (kind === "income") income += amount;
    else spending -= amount;
  }
  const net = income - spending;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Income" value={formatMoney(income)} />
      <Stat label="Spending" value={formatMoney(spending)} />
      <Stat label="Net" value={formatMoney(net, "IDR", { signed: true })} tone={net < 0 ? "negative" : "positive"} />
      {skipped > 0 && (
        <p className="col-span-3 text-xs text-muted-foreground">
          Excludes {skipped} transaction{skipped > 1 && "s"} in other currencies (conversion comes later).
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "truncate text-base font-semibold tabular-nums sm:text-lg " +
          (tone === "negative" ? "text-destructive" : tone === "positive" ? "text-primary" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
