import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { AccountRow } from "@/components/accounts/account-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccounts, getAccountTypes, getCurrencies, getRateMap } from "@/lib/data/queries";
import { ACCOUNT_CLASSES, isLiability } from "@/lib/finance/accounts";
import type { Account } from "@/lib/finance/types";
import { sumInBase, type Rates } from "@/lib/finance/fx";
import { MissingRatesNote } from "@/components/app/stat";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Accounts · Tora" };

export default function AccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountsView />
    </Suspense>
  );
}

async function AccountsView() {
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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <NetWorthSummary accounts={active} rates={rates} />
        {addButton}
      </div>

      {ACCOUNT_CLASSES.map((section) => {
        const items = active.filter((a) => a.class === section.value);
        if (items.length === 0) return null;
        return (
          <Card key={section.value} className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">{section.title}</CardTitle>
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

// Totals in IDR; foreign accounts are converted with the rates in Settings.
function NetWorthSummary({ accounts, rates }: { accounts: Account[]; rates: Rates }) {
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const sum = (list: Account[]) => sumInBase(list.map((a) => ({ amount: a.balance, currency: a.currency })), rates);
  const assets = sum(counted.filter((a) => !isLiability(a.class)));
  const debts = sum(counted.filter((a) => isLiability(a.class)));
  const missing = [...new Set([...assets.missing, ...debts.missing])];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">Net worth</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(assets.total + debts.total)}</span>
      <span className="text-sm text-muted-foreground tabular-nums">
        Assets {formatMoney(assets.total)} · Debts {formatMoney(Math.abs(debts.total))}
      </span>
      <MissingRatesNote currencies={missing} />
    </div>
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
