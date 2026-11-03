// Money display helpers. Amounts come from Postgres numeric columns, which can
// arrive as strings; Intl formats any ISO 4217 currency.

// Display decimals; keep in sync with public.currencies.decimals.
const DECIMALS: Record<string, number> = { IDR: 0, JPY: 0, KRW: 0 };

// Indonesian number style: Rp 1.250.000 and US$ 10,50.
const LOCALE = "id-ID";

export function formatMoney(
  amount: number | string,
  currency = "IDR",
  { signed = false }: { signed?: boolean } = {},
) {
  const digits = DECIMALS[currency] ?? 2;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(Number(amount));
}

export const currencyDecimals = (currency: string) => DECIMALS[currency] ?? 2;

const MAX_AMOUNT = 9_999_999_999_999_999; // numeric(18,2)

// Parses what people type: "1.250.000", "1250000", "10,50", "10.50", "Rp 45.000".
// Indonesian style: "." groups thousands, "," is the decimal mark. Without a comma,
// a single "." followed by 1–2 digits is treated as a decimal point (10.50).
// Returns a positive number, or null if it isn't a valid amount.
export function parseAmount(input: string, currency = "IDR"): number | null {
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const digits = currencyDecimals(currency);
  const factor = 10 ** digits;
  const value = Math.round(Number(s) * factor) / factor;
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

// Short form for tight spaces like calendar cells: 45.000 → "45 rb", 1.250.000 → "1,3 jt".
// IDR only (other currencies are converted before display).
export function formatCompact(amount: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 })
    .format(Math.abs(amount))
    .replace(/\s/g, " ");
}
