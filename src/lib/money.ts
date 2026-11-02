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
