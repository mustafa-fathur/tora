import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { MissingRatesNote, shortMoney, Stat } from "@/components/app/stat";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { type Bill, BillList, type DayRow, MonthView, WeekView } from "@/components/calendar/calendar-views";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFinance } from "@/lib/data/finance";
import {
  getRecurringItems,
  getTransactions,
  getTransactionsBetween,
  getTransferPartners,
  type TxSlim,
} from "@/lib/data/queries";
import {
  CALENDAR_VIEWS,
  type CalendarView,
  calendarRange,
  calendarTitle,
  dailyTotals,
  monthGrid,
  weekDays,
} from "@/lib/finance/calendar";
import { totals } from "@/lib/finance/cashflow";
import { isIsoDate, today } from "@/lib/finance/dates";
import { addDays, occurrences } from "@/lib/finance/recurring";
import type { Account, CategoryGroup } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Calendar · Tora" };

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-xl" />}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CalendarContent({ searchParams }: Pick<PageProps<"/calendar">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const todayIso = today();
  const view: CalendarView = CALENDAR_VIEWS.includes(sp.view as CalendarView) ? (sp.view as CalendarView) : "month";
  const date = typeof sp.date === "string" && isIsoDate(sp.date) ? sp.date : todayIso;
  const { start, end, prev, next } = calendarRange(view, date);
  const lastDay = addDays(end, -1);

  const [finance, rows, recurring] = await Promise.all([
    loadFinance(),
    getTransactionsBetween(start, end),
    getRecurringItems(),
  ]);
  const { ctx, accounts, groups, missingRates } = finance;
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  const dayTotals = dailyTotals(rows, ctx);

  // Bills and income due in view: the next due date onwards (an overdue one shows on its date).
  const bills: Bill[] = recurring
    .filter((r) => r.is_active)
    .flatMap((r) =>
      occurrences(r, lastDay, 62)
        .filter((d) => d >= start)
        .map((d) => ({
          id: `${r.id}-${d}`,
          name: r.name,
          amount: Number(r.amount),
          currency: currencyOf.get(r.account_id) ?? "IDR",
          date: d,
          overdue: d < todayIso,
        })),
    );

  // Totals for the period itself (a month grid also shows edges of other months).
  const inPeriod = view === "month" ? rows.filter((r) => r.date.startsWith(date.slice(0, 7))) : rows;
  const period = totals(inPeriod, ctx);
  // Date kept when switching views: today if it's in the shown month, else the 1st.
  const focus =
    view === "month" ? (todayIso.startsWith(date.slice(0, 7)) ? todayIso : `${date.slice(0, 7)}-01`) : date;

  return (
    <>
      <CalendarToolbar view={view} title={calendarTitle(view, date)} prev={prev} next={next} focus={focus} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Income" value={formatMoney(period.income)} short={shortMoney(period.income)} />
        <Stat label="Spending" value={formatMoney(period.spending)} short={shortMoney(period.spending)} />
        <Stat
          label="Net"
          value={formatMoney(period.net, "IDR", { signed: true })}
          short={shortMoney(period.net, true)}
          tone={period.net < 0 ? "negative" : "positive"}
        />
      </div>
      <MissingRatesNote currencies={missingRates} />

      {view === "month" && (
        <MonthView weeks={monthGrid(date)} month={date.slice(0, 7)} todayIso={todayIso} totals={dayTotals} bills={bills} />
      )}

      {view === "week" && (
        <WeekView
          days={weekDays(date)}
          todayIso={todayIso}
          totals={dayTotals}
          bills={bills}
          rows={groupRows(rows, ctx.categoryById, currencyOf)}
        />
      )}

      {view === "day" && <DayView date={date} bills={bills} accounts={accounts} groups={groups} />}
    </>
  );
}

function groupRows(rows: TxSlim[], categoryById: Map<string, { name: string }>, currencyOf: Map<string, string>) {
  const out: Record<string, DayRow[]> = {};
  for (const r of rows) {
    const label =
      r.description ||
      (r.category_id ? categoryById.get(r.category_id)?.name : undefined) ||
      (r.kind === "transfer" ? "Transfer" : r.kind === "adjustment" ? "Balance update" : "Uncategorized");
    (out[r.date] ??= []).push({
      id: r.id,
      description: label,
      amount: Number(r.amount),
      currency: currencyOf.get(r.account_id) ?? "IDR",
      kind: r.kind,
    });
  }
  return out;
}

async function DayView({
  date,
  bills,
  accounts,
  groups,
}: {
  date: string;
  bills: Bill[];
  accounts: Account[];
  groups: CategoryGroup[];
}) {
  const transactions = await getTransactions({ start: date, end: addDays(date, 1) });
  const partners = await getTransferPartners(transactions);
  return (
    <>
      <div className="flex justify-end">
        <TransactionFormDialog
          accounts={accounts}
          groups={groups}
          defaultDate={date}
          trigger={
            <Button variant="outline">
              <Plus /> Add on this day
            </Button>
          }
        />
      </div>
      <BillList bills={bills.filter((b) => b.date === date)} />
      {transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No transactions on this day.
        </p>
      ) : (
        <TransactionList transactions={transactions} partners={partners} accounts={accounts} groups={groups} />
      )}
    </>
  );
}
