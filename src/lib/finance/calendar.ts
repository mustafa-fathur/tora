import { type CashflowContext, classify, round, type TxLike } from "@/lib/finance/cashflow";
import { toBase } from "@/lib/finance/fx";
import { addDays } from "@/lib/finance/recurring";

// Calendar helpers. Weeks start on Monday. Dates are YYYY-MM-DD strings.

export type CalendarView = "month" | "week" | "day";
export const CALENDAR_VIEWS: CalendarView[] = ["month", "week", "day"];

const dow = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 … Sun=6

export const weekStart = (date: string) => addDays(date, -dow(date));

export const weekDays = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i));

// Weeks (Mon–Sun) covering the month of `date`.
export function monthGrid(date: string): string[][] {
  const first = `${date.slice(0, 7)}-01`;
  const month = first.slice(0, 7);
  const weeks: string[][] = [];
  let start = weekStart(first);
  while (weeks.length === 0 || start.slice(0, 7) <= month) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
    start = addDays(start, 7);
    if (start.slice(0, 7) > month) break;
  }
  return weeks;
}

function shiftMonths(date: string, delta: number) {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

// Visible range (end exclusive) and where ◀ ▶ go for each view.
export function calendarRange(view: CalendarView, date: string) {
  if (view === "day") return { start: date, end: addDays(date, 1), prev: addDays(date, -1), next: addDays(date, 1) };
  if (view === "week") {
    const start = weekStart(date);
    return { start, end: addDays(start, 7), prev: addDays(start, -7), next: addDays(start, 7) };
  }
  const grid = monthGrid(date);
  return {
    start: grid[0][0],
    end: addDays(grid.at(-1)![6], 1),
    prev: shiftMonths(date, -1),
    next: shiftMonths(date, 1),
  };
}

export type DayTotals = { income: number; spending: number; count: number };

// Income and spending per day in IDR (transfers and balance updates don't count,
// refunds reduce spending). `count` includes every transaction on that day.
export function dailyTotals(rows: TxLike[], ctx: CashflowContext): Record<string, DayTotals> {
  const out: Record<string, DayTotals> = {};
  for (const t of rows) {
    const day = (out[t.date] ??= { income: 0, spending: 0, count: 0 });
    day.count++;
    const kind = classify(t, ctx);
    if (!kind) continue;
    const v = toBase(Number(t.amount), ctx.currencyOf.get(t.account_id) ?? "IDR", ctx.rates);
    if (v === null) continue;
    if (kind === "income") day.income = round(day.income + v);
    else day.spending = round(day.spending - v);
  }
  return out;
}

export function calendarTitle(view: CalendarView, date: string) {
  const d = (s: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${s}T00:00:00Z`));
  if (view === "month") return d(date, { month: "long", year: "numeric" });
  if (view === "day") return d(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const days = weekDays(date);
  return `${d(days[0], { day: "numeric", month: "short" })} – ${d(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
}
