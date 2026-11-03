import { Repeat } from "lucide-react";
import Link from "next/link";

import type { DayTotals } from "@/lib/finance/calendar";
import { formatCompact, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type Bill = { id: string; name: string; amount: number; currency: string; date: string; overdue: boolean };
export type DayRow = { id: string; description: string; amount: number; currency: string; kind: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayLink = (date: string) => `/calendar?view=day&date=${date}`;
const dayNumber = (date: string) => Number(date.slice(8, 10));

// Spending heat: a light coral wash, stronger on bigger spending days.
const heat = (spending: number, max: number) =>
  spending > 0 && max > 0
    ? { backgroundColor: `color-mix(in oklch, var(--chart-expense) ${Math.round(6 + (spending / max) * 22)}%, transparent)` }
    : undefined;

export function MonthView({
  weeks,
  month,
  todayIso,
  totals,
  bills,
}: {
  weeks: string[][];
  month: string; // YYYY-MM
  todayIso: string;
  totals: Record<string, DayTotals>;
  bills: Bill[];
}) {
  const max = Math.max(0, ...Object.values(totals).map((t) => t.spending));
  const billsOn = (d: string) => bills.filter((b) => b.date === d);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => {
          const t = totals[date];
          const due = billsOn(date);
          const inMonth = date.startsWith(month);
          const isToday = date === todayIso;
          return (
            <Link
              key={date}
              href={dayLink(date)}
              aria-label={`${date}: spent ${formatMoney(t?.spending ?? 0)}, received ${formatMoney(t?.income ?? 0)}${due.length ? `, ${due.length} due` : ""}`}
              style={heat(t?.spending ?? 0, max)}
              className={cn(
                "flex min-h-16 flex-col gap-0.5 border-r border-b p-1.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-24 sm:p-2 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {dayNumber(date)}
              </span>
              <span className="mt-auto flex flex-col text-[10px] leading-tight tabular-nums sm:text-xs">
                {t?.income ? <span className="text-primary">+{formatCompact(t.income)}</span> : null}
                {t?.spending ? <span>−{formatCompact(t.spending)}</span> : null}
                {due.length > 0 && (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex w-fit items-center gap-0.5 rounded border border-dashed px-1",
                      due.some((b) => b.overdue) ? "border-destructive text-destructive" : "border-muted-foreground/50 text-muted-foreground",
                    )}
                  >
                    <Repeat className="size-2.5" aria-hidden />
                    <span className="max-sm:hidden">{due.length === 1 ? due[0].name : `${due.length} due`}</span>
                    <span className="sm:hidden">{due.length}</span>
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function WeekView({
  days,
  todayIso,
  totals,
  rows,
  bills,
}: {
  days: string[];
  todayIso: string;
  totals: Record<string, DayTotals>;
  rows: Record<string, DayRow[]>;
  bills: Bill[];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((date, i) => {
        const t = totals[date];
        const list = rows[date] ?? [];
        const due = bills.filter((b) => b.date === date);
        return (
          <section key={date} aria-label={date} className="flex flex-col rounded-xl border bg-card">
            <Link
              href={dayLink(date)}
              className="flex items-baseline justify-between gap-2 border-b px-3 py-2 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 md:flex-col md:items-start md:gap-0"
            >
              <span className="text-xs text-muted-foreground">{WEEKDAYS[i]}</span>
              <span className={cn("font-semibold", date === todayIso && "text-primary")}>
                {dayNumber(date)}
                {date === todayIso && <span className="ml-1 text-xs font-normal">today</span>}
              </span>
            </Link>
            <div className="flex flex-1 flex-col gap-1.5 p-2 text-xs">
              {list.slice(0, 6).map((r) => (
                <div key={r.id} className="flex justify-between gap-2">
                  <span className="truncate">{r.description}</span>
                  <span className={cn("shrink-0 tabular-nums", r.amount > 0 && r.kind === "regular" && "text-primary", r.kind !== "regular" && "text-muted-foreground")}>
                    {formatMoney(r.amount, r.currency, { signed: true })}
                  </span>
                </div>
              ))}
              {list.length > 6 && (
                <Link href={dayLink(date)} className="text-muted-foreground hover:text-foreground">
                  +{list.length - 6} more
                </Link>
              )}
              {due.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    "flex justify-between gap-2 rounded border border-dashed px-1.5 py-1",
                    b.overdue ? "border-destructive text-destructive" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">
                    {b.overdue ? "Overdue: " : "Due: "}
                    {b.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(b.amount, b.currency, { signed: true })}</span>
                </div>
              ))}
              {list.length === 0 && due.length === 0 && <span className="text-muted-foreground">Nothing</span>}
            </div>
            {(t?.income || t?.spending) ? (
              <div className="flex justify-between gap-2 border-t px-3 py-1.5 text-xs tabular-nums">
                <span className="text-primary">{t.income ? `+${formatCompact(t.income)}` : ""}</span>
                <span>{t.spending ? `−${formatCompact(t.spending)}` : ""}</span>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function BillList({ bills }: { bills: Bill[] }) {
  if (!bills.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Due this day">
      <h3 className="px-1 text-sm font-medium text-muted-foreground">Due</h3>
      <ul className="divide-y rounded-xl border border-dashed bg-card">
        {bills.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <Repeat className={cn("size-4", b.overdue ? "text-destructive" : "text-muted-foreground")} aria-hidden />
            <span className="flex-1 truncate">
              {b.name}
              {b.overdue && <span className="ml-2 text-destructive">overdue</span>}
            </span>
            <span className="tabular-nums">{formatMoney(b.amount, b.currency, { signed: true })}</span>
            <Link href="/recurring" className="text-muted-foreground hover:text-foreground">
              Record
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
