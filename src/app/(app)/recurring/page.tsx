import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Stat } from "@/components/app/stat";
import { RecurringFormDialog } from "@/components/recurring/recurring-dialogs";
import { RecurringRow } from "@/components/recurring/recurring-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import { getRecurringItems } from "@/lib/data/queries";
import { today } from "@/lib/finance/dates";
import { toBase } from "@/lib/finance/fx";
import { addDays, monthlyEquivalent } from "@/lib/finance/recurring";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Recurring · Tora" };

export default function RecurringPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RecurringView />
    </Suspense>
  );
}

async function RecurringView() {
  await connection();
  const [{ accounts, groups, rates }, items] = await Promise.all([loadFinance(), getRecurringItems()]);
  const todayIso = today();
  const soon = addDays(todayIso, 30);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  const active = items.filter((i) => i.is_active);

  let monthlyOut = 0;
  let monthlyIn = 0;
  for (const i of active) {
    const v = toBase(monthlyEquivalent(Number(i.amount), i.frequency, i.interval_count), currencyOf.get(i.account_id) ?? "IDR", rates) ?? 0;
    if (v < 0) monthlyOut -= v;
    else monthlyIn += v;
  }
  const upcoming = active.filter((i) => i.next_due_date <= soon);
  const later = items.filter((i) => !upcoming.includes(i));

  const addButton = (
    <RecurringFormDialog
      accounts={accounts}
      groups={groups}
      trigger={
        <Button>
          <Plus /> Add recurring
        </Button>
      }
    />
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
        <p className="text-lg font-medium">Track your regular bills and income</p>
        <p className="max-w-sm text-muted-foreground">
          Internet, electricity, subscriptions, rent, salary… Tora shows what&apos;s due and records
          it in one tap.
        </p>
        {accounts.length ? addButton : <p className="text-sm text-muted-foreground">Add an account first.</p>}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
          <Stat label="Fixed costs / month" value={formatMoney(Math.round(monthlyOut))} />
          <Stat label="Regular income / month" value={formatMoney(Math.round(monthlyIn))} />
        </div>
        {addButton}
      </div>
      <Section title="Due in the next 30 days" empty="Nothing due in the next 30 days.">
        {upcoming.map((i) => (
          <RecurringRow key={i.id} item={i} accounts={accounts} groups={groups} todayIso={todayIso} />
        ))}
      </Section>
      {later.length > 0 && (
        <Section title="Later and paused">
          {later.map((i) => (
            <RecurringRow key={i.id} item={i} accounts={accounts} groups={groups} todayIso={todayIso} />
          ))}
        </Section>
      )}
    </>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      {children.length ? (
        <ul className="divide-y rounded-xl border bg-card">{children}</ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
