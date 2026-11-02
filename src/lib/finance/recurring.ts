import type { Database } from "@/lib/supabase/database.types";

export type Frequency = Database["public"]["Enums"]["recurrence_frequency"];

export const FREQUENCY_LABELS: Record<Frequency, [string, string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
  yearly: ["year", "years"],
};

export function describeFrequency(frequency: Frequency, interval: number) {
  const [one, many] = FREQUENCY_LABELS[frequency];
  if (interval === 1) return { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[frequency];
  return `Every ${interval} ${interval === 1 ? one : many}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// The next due date after `date`. Months and years keep the day of month, clamped
// to the month's length (Jan 31 -> Feb 28). `anchorDay` keeps a 31st-of-month
// bill on the 31st when the month allows it.
export function nextDate(date: string, frequency: Frequency, interval = 1, anchorDay?: number) {
  const d = new Date(`${date}T00:00:00Z`);
  if (frequency === "daily" || frequency === "weekly") {
    d.setUTCDate(d.getUTCDate() + interval * (frequency === "weekly" ? 7 : 1));
    return iso(d);
  }
  const months = frequency === "monthly" ? interval : interval * 12;
  const total = d.getUTCMonth() + months;
  const y = d.getUTCFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const day = Math.min(anchorDay ?? d.getUTCDate(), daysInMonth(y, m));
  return `${y}-${pad(m + 1)}-${pad(day)}`;
}

// Due dates from `from` (inclusive) up to `until` (inclusive), at most `limit`.
export function occurrences(
  item: { next_due_date: string; frequency: Frequency; interval_count: number; end_date: string | null },
  until: string,
  limit = 31,
) {
  const out: string[] = [];
  const anchor = Number(item.next_due_date.slice(8, 10));
  let d = item.next_due_date;
  while (d <= until && (!item.end_date || d <= item.end_date) && out.length < limit) {
    out.push(d);
    d = nextDate(d, item.frequency, item.interval_count, anchor);
  }
  return out;
}

// Days between two ISO dates (b - a).
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};

// Rough monthly equivalent of a recurring amount (for "fixed costs per month").
export function monthlyEquivalent(amount: number, frequency: Frequency, interval: number) {
  const perMonth = { daily: 30.44, weekly: 4.345, monthly: 1, yearly: 1 / 12 }[frequency];
  return (amount * perMonth) / interval;
}

// Whole months from `from` until `to` (at least 1 when `to` is in the future).
export function monthsUntil(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  return to > from ? Math.max(1, months) : 0;
}
