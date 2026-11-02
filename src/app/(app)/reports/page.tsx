import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { RangeSwitcher } from "@/components/app/range-switcher";
import { MissingRatesNote, Stat } from "@/components/app/stat";
import { CategoryBars } from "@/components/charts/category-bars";
import { NetWorthChart } from "@/components/charts/charts";
import { InsightList } from "@/components/insights/insight-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOverview } from "@/lib/data/overview";
import { getBalanceMovements, getTransactionsBetween } from "@/lib/data/queries";
import { byGroup, byMonth, totals } from "@/lib/finance/cashflow";
import { monthRange, shiftMonth } from "@/lib/finance/dates";
import { netWorthHistory } from "@/lib/finance/networth";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Reports · Tora" };

const RANGES = [3, 6, 12];

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ReportsView searchParams={searchParams} />
    </Suspense>
  );
}

const shortMonth = (m: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

async function ReportsView({ searchParams }: Pick<PageProps<"/reports">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const range = RANGES.includes(Number(sp.months)) ? Number(sp.months) : 6;
  const overview = await loadOverview();
  const { ctx, accounts, rates, missingRates, month } = overview;
  const months = Array.from({ length: range }, (_, i) => shiftMonth(month, i - range + 1));
  const end = monthRange(month).end;
  const [rows, movements] = await Promise.all([
    getTransactionsBetween(monthRange(months[0]).start, end),
    getBalanceMovements(end),
  ]);

  const t = totals(rows, ctx);
  const groups = byGroup(rows, ctx);
  const history = netWorthHistory(accounts, movements, months, rates);
  const change = history.length > 1 ? history.at(-1)!.netWorth - history[0].netWorth : 0;

  // Trend table: top groups by month.
  const top = groups.slice(0, 6);
  const perMonth = months.map((m) => {
    const monthRows = rows.filter((r) => r.date.startsWith(m));
    return new Map(byGroup(monthRows, ctx).map((g) => [g.id, g.amount]));
  });
  const monthTotals = byMonth(rows, ctx, months);

  return (
    <>
      <RangeSwitcher value={range} options={RANGES} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={`Income, ${range} months`} value={formatMoney(t.income)} />
        <Stat label={`Spending, ${range} months`} value={formatMoney(t.spending)} />
        <Stat label="Average spending / month" value={formatMoney(Math.round(t.spending / range))} />
        <Stat label="Net worth change" value={formatMoney(change, "IDR", { signed: true })} tone={change < 0 ? "negative" : "positive"} />
      </div>
      <MissingRatesNote currencies={missingRates} />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net worth</CardTitle>
            <CardDescription>End of each month, at today&apos;s exchange rates.</CardDescription>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={history} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
            <CardDescription>Simple observations about this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <InsightList items={overview.insights} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending by category</CardTitle>
          <CardDescription>
            Last {range} months · average {formatMoney(Math.round(t.spending / range))} per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryBars items={groups} total={t.spending} empty="No spending in this period." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Month by month</CardTitle>
          <CardDescription>Spending in your biggest categories.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-max text-sm tabular-nums">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-normal">Category</th>
                {months.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-normal">{shortMonth(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top.map((g) => (
                <tr key={g.id} className="border-b">
                  <td className="py-2 pr-4">{g.icon} {g.name}</td>
                  {perMonth.map((p, i) => (
                    <td key={months[i]} className="px-2 py-2 text-right">{p.get(g.id) ? formatMoney(p.get(g.id)!) : "–"}</td>
                  ))}
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2 pr-4">All spending</td>
                {monthTotals.map((m) => (
                  <td key={m.month} className="px-2 py-2 text-right">{formatMoney(m.spending)}</td>
                ))}
              </tr>
              <tr className="text-muted-foreground">
                <td className="py-2 pr-4">Income</td>
                {monthTotals.map((m) => (
                  <td key={m.month} className="px-2 py-2 text-right">{formatMoney(m.income)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
