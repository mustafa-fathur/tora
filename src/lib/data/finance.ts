import { getAccounts, getCategories, getRateMap, toCategoryGroups } from "@/lib/data/queries";
import { makeContext } from "@/lib/finance/cashflow";

// Everything most finance pages need, loaded once per request.
export async function loadFinance() {
  const [accounts, categories, rates] = await Promise.all([getAccounts(), getCategories(), getRateMap()]);
  return {
    accounts,
    categories,
    groups: toCategoryGroups(categories),
    rates,
    ctx: makeContext(accounts, categories, rates),
    // Foreign currencies used by accounts that have no rate yet.
    missingRates: [...new Set(accounts.map((a) => a.currency))].filter((c) => c !== "IDR" && !rates[c]),
  };
}
