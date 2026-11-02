// Currency conversion to the base currency (IDR) using the user's latest rates.

export const BASE = "IDR";

export type Rates = Record<string, number>; // 1 unit of currency = rate IDR

// Converted amount, or null when there's no rate for that currency.
export function toBase(amount: number, currency: string, rates: Rates): number | null {
  if (currency === BASE) return amount;
  const rate = rates[currency];
  return rate ? amount * rate : null;
}

// Adds up amounts in mixed currencies. Currencies without a rate are skipped and reported.
export function sumInBase(items: { amount: number; currency: string }[], rates: Rates) {
  let total = 0;
  const missing = new Set<string>();
  for (const { amount, currency } of items) {
    const v = toBase(amount, currency, rates);
    if (v === null) missing.add(currency);
    else total += v;
  }
  return { total: Math.round(total * 100) / 100, missing: [...missing] };
}
