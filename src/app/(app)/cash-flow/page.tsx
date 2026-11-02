import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { MonthSwitcher } from "@/components/app/month-switcher";
import { MissingRatesNote, Stat } from "@/components/app/stat";
import { CategoryBars } from "@/components/charts/category-bars";
import { CashflowChart } from "@/components/charts/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import { getTransactionsBetween } from "@/lib/data/queries";
import { byGroup, byMonth, totals } from "@/lib/finance/cashflow";
import { isMonth, monthRange, shiftMonth, today } from "@/lib/finance/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Cash flow · Tora" };

export default function CashFlowPage({ searchParams }: PageProps<"/cash-flow">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <CashFlowView searchParams={searchParams} />
    </Suspense>
  );
}

async function CashFlowView({ searchParams }: Pick<PageProps<"/cash-flow">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const month = typeof sp.month === "string" && isMonth(sp.month) ? sp.month : today().slice(0, 7);
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11));
  const [{ ctx, missingRates }, rows] = await Promise.all([
    loadFinance(),
    getTransactionsBetween(monthRange(months[0]).start, monthRange(month).end),
  ]);
  const monthly = byMonth(rows, ctx, months);
  const current = rows.filter((r) => r.date.startsWith(month));
  const t = totals(current, ctx);
  const spending = byGroup(current, ctx, "expense");
  const income = byGroup(current, ctx, "income");
  const savingsRate = t.income > 0 ? Math.round((t.net / t.income) * 100) : null;
  const link = (id: string) => `/transactions?month=${month}&category=${id}`;

  return (
    <>
      <MonthSwitcher month={month} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Income" value={formatMoney(t.income)} />
        <Stat label="Spending" value={formatMoney(t.spending)} />
        <Stat label="Net" value={formatMoney(t.net, "IDR", { signed: true })} tone={t.net < 0 ? "negative" : "positive"} />
        <Stat label="Savings rate" value={savingsRate === null ? "–" : `${savingsRate}%`} hint="Net ÷ income" />
      </div>
      <MissingRatesNote currencies={missingRates} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <CashflowChart data={monthly} />
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars items={spending} total={t.spending} href={(i) => link(i.id)} empty="No spending this month." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars items={income} total={t.income} href={(i) => link(i.id)} empty="No income this month." tone="income" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
