import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { AccountRow } from "@/components/accounts/account-row";
import { NetWorthOverview } from "@/components/accounts/net-worth-overview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccounts, getAccountTypes, getBalanceMovements, getCurrencies, getRateMap } from "@/lib/data/queries";
import { ACCOUNT_CLASSES } from "@/lib/finance/accounts";
import { monthRange, shiftMonth, today } from "@/lib/finance/dates";
import { sumInBase } from "@/lib/finance/fx";
import { netWorthHistory } from "@/lib/finance/networth";
import type { Account } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Accounts · Tora" };

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountsView searchParams={searchParams} />
    </Suspense>
  );
}

const RANGES = [3, 6, 12];

async function AccountsView({ searchParams }: Pick<PageProps<"/accounts">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const range = RANGES.includes(Number(sp.months)) ? Number(sp.months) : 6;
  const [accounts, currencies, types, rates] = await Promise.all([getAccounts(), getCurrencies(), getAccountTypes(), getRateMap()]);
  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  const addButton = (
    <AccountFormDialog
      currencies={currencies}
      types={types}
      trigger={
        <Button>
          <Plus /> Add account
        </Button>
      }
    />
  );

  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
        <p className="text-lg font-medium">Add your first account</p>
        <p className="max-w-sm text-muted-foreground">
          Start with where your money lives: a bank account, an e-wallet, or the cash in your
          wallet. You can add credit cards and investments too.
        </p>
        {addButton}
      </div>
    );
  }

  // Net worth counts every account marked "include in net worth" (archived ones too),
  // the same rule as the dashboard. Foreign currencies convert with Settings rates.
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const sum = (list: Account[]) => sumInBase(list.map((a) => ({ amount: a.balance, currency: a.currency })), rates);
  const byClass = (c: string) => sum(counted.filter((a) => a.class === c));
  const cash = byClass("cash");
  const investment = byClass("investment");
  const debts = byClass("liability");
  const netWorth = cash.total + investment.total + debts.total;
  const missing = [...new Set([...cash.missing, ...investment.missing, ...debts.missing])];

  const month = today().slice(0, 7);
  const months = Array.from({ length: range }, (_, i) => shiftMonth(month, i - range + 1));
  const history = netWorthHistory(accounts, await getBalanceMovements(monthRange(month).end), months, rates);
  const change = history.length ? netWorth - history[0].netWorth : 0;

  return (
    <>
      <NetWorthOverview
        netWorth={netWorth}
        change={change}
        months={range}
        composition={{ cash: Math.max(0, cash.total), investment: Math.max(0, investment.total), debts: Math.abs(Math.min(0, debts.total)) }}
        history={history}
        missing={missing}
        action={addButton}
      />

      {ACCOUNT_CLASSES.map((section) => {
        const items = active.filter((a) => a.class === section.value);
        if (items.length === 0) return null;
        const subtotal = sum(items.filter((a) => a.include_in_net_worth)).total;
        return (
          <Card key={section.value} className="gap-0 py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b py-4">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <span className="font-semibold tabular-nums">{formatMoney(subtotal)}</span>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {items.map((a) => (
                  <AccountRow key={a.id} account={a} currencies={currencies} types={types} />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {archived.length > 0 && (
        <details className="rounded-xl border px-6 py-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Archived accounts ({archived.length})
          </summary>
          <ul className="divide-y">
            {archived.map((a) => (
              <AccountRow key={a.id} account={a} currencies={currencies} types={types} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-64" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
