// Dates are plain YYYY-MM-DD strings in the user's timezone (Asia/Jakarta for now).
export const TIMEZONE = "Asia/Jakarta";

// Only call at request time or in the browser (uses the current time).
export function today(timeZone = TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date()); // YYYY-MM-DD
}

// Current time as "HH:MM" (same caveat as today()).
export function nowTime(timeZone = TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(),
  );
}

// "HH:MM" or "HH:MM:SS"
export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);

export const isIsoDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

// "2026-11" -> { start: "2026-11-01", end: "2026-12-01" } (end is exclusive)
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

// "2026-11-02" -> "Mon, 2 Nov 2026"
export function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
