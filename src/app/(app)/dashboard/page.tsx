import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Meter, MissingRatesNote, Stat } from "@/components/app/stat";
import { CategoryBars } from "@/components/charts/category-bars";
import { NetWorthChart } from "@/components/charts/charts";
import { InsightList } from "@/components/insights/insight-list";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOverview } from "@/lib/data/overview";
import { getBalanceMovements, getGoals, getTransactions } from "@/lib/data/queries";
import { byGroup, totals } from "@/lib/finance/cashflow";
import { formatDay, monthRange, shiftMonth } from "@/lib/finance/dates";
import { sumInBase } from "@/lib/finance/fx";
import { netWorthHistory } from "@/lib/finance/networth";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard · Tora" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}

function More({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <CardAction>
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        {label} <ArrowRight className="size-3.5" />
      </Link>
    </CardAction>
  );
}

async function DashboardView() {
  await connection();
  const o = await loadOverview();
  const { accounts, ctx, rates, month, todayIso } = o;

  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <p className="text-lg font-medium">Welcome to Tora 🐯</p>
        <p className="max-w-md text-muted-foreground">
          Start by adding where your money lives: a bank account, an e-wallet or your cash. Then
          record transactions with “Add transaction” at the top, or import a bank CSV.
        </p>
        <Link href="/accounts" className="font-medium text-primary underline-offset-4 hover:underline">
          Add your first account →
        </Link>
      </div>
    );
  }

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const [movements, recent, goals] = await Promise.all([
    getBalanceMovements(monthRange(month).end),
    getTransactions({ start: "1900-01-01", end: "9999-12-31", limit: 6 }),
    getGoals(),
  ]);
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const netWorth = sumInBase(counted.map((a) => ({ amount: a.balance, currency: a.currency })), rates);
  const history = netWorthHistory(accounts, movements, months, rates);
  const t = totals(o.thisMonth, ctx);
  const spending = byGroup(o.thisMonth, ctx);
  const budgets = o.lines
    .filter((l) => l.total.budget !== null)
    .sort((a, b) => (b.total.ratio ?? 0) - (a.total.ratio ?? 0))
    .slice(0, 5);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = ctx.categoryById;
  const activeGoals = goals.filter((g) => !g.is_archived).slice(0, 3);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net worth" value={formatMoney(netWorth.total)} className="col-span-2 lg:col-span-1" />
        <Stat label="Income this month" value={formatMoney(t.income)} />
        <Stat label="Spending this month" value={formatMoney(t.spending)} />
        <Stat label="Net this month" value={formatMoney(t.net, "IDR", { signed: true })} tone={t.net < 0 ? "negative" : "positive"} className="max-lg:col-span-2" />
      </div>
      <MissingRatesNote currencies={netWorth.missing} />

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net worth, last 6 months</CardTitle>
            <More href="/reports" label="Reports" />
          </CardHeader>
          <CardContent>
            <NetWorthChart data={history} height="h-52" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightList items={o.insights.slice(0, 4)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budgets</CardTitle>
            <More href="/budgets" />
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No budgets this month. <Link href="/budgets" className="text-primary underline-offset-4 hover:underline">Set some up</Link>.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {budgets.map((l) => (
                  <li key={l.group.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate">{l.group.icon} {l.group.name}</span>
                      <span className={cn("tabular-nums", l.total.status === "over" && "text-destructive")}>
                        {formatMoney(l.total.spent)} <span className="text-muted-foreground">/ {formatMoney(l.total.budget!)}</span>
                      </span>
                    </div>
                    <Meter ratio={l.total.ratio ?? 0} status={l.total.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming up</CardTitle>
            <More href="/recurring" />
          </CardHeader>
          <CardContent>
            {o.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 2 weeks.</p>
            ) : (
              <ul className="divide-y">
                {o.upcoming.slice(0, 6).map(({ item, date }) => (
                  <li key={`${item.id}-${date}`} className="flex items-center gap-3 py-2 text-sm">
                    <span className={cn("w-24 shrink-0", date < todayIso ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {date < todayIso ? "Overdue" : date === todayIso ? "Today" : formatDay(date).slice(0, -5)}
                    </span>
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className={cn("tabular-nums", Number(item.amount) > 0 && "text-primary")}>
                      {formatMoney(Number(item.amount), accountById.get(item.account_id)?.currency, { signed: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending this month</CardTitle>
            <More href="/cash-flow" label="Cash flow" />
          </CardHeader>
          <CardContent>
            <CategoryBars items={spending} total={t.spending} limit={5} href={(i) => `/transactions?month=${month}&category=${i.id}`} empty="No spending yet this month." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <More href="/transactions" />
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((r) => {
                  const category = r.category_id ? categoryById.get(r.category_id) : undefined;
                  const account = accountById.get(r.account_id);
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{r.description || category?.name || (r.kind === "transfer" ? "Transfer" : r.kind === "adjustment" ? "Balance update" : "Uncategorized")}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatDay(r.date)} · {account?.name}
                        </span>
                      </span>
                      <span className={cn("tabular-nums", Number(r.amount) > 0 && r.kind === "regular" && "text-primary", r.kind !== "regular" && "text-muted-foreground")}>
                        {formatMoney(Number(r.amount), account?.currency, { signed: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals</CardTitle>
            <More href="/goals" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {activeGoals.map((g) => {
              const account = accountById.get(g.account_id ?? "");
              const saved = account ? Math.max(0, account.balance) : Number(g.saved_amount);
              const ratio = saved / Number(g.target_amount);
              return (
                <div key={g.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.name}</span>
                    <span className="text-muted-foreground tabular-nums">{Math.min(100, Math.round(ratio * 100))}%</span>
                  </div>
                  <Meter ratio={ratio} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatMoney(saved, g.currency)} of {formatMoney(Number(g.target_amount), g.currency)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
