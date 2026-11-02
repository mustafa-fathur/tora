import { round } from "@/lib/finance/cashflow";
import { toBase, type Rates } from "@/lib/finance/fx";
import { monthRange } from "@/lib/finance/dates";

type AccountLike = {
  id: string;
  currency: string;
  opening_balance: number | string;
  include_in_net_worth: boolean;
  created_at: string;
};

// Net worth at the end of each month (oldest first), using today's exchange rates.
// An account's opening balance counts from the month it was added to Tora.
export function netWorthHistory(
  accounts: AccountLike[],
  rows: { account_id: string; date: string; amount: number | string }[],
  months: string[],
  rates: Rates,
) {
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const byAccount = new Map<string, { date: string; amount: number }[]>();
  for (const r of rows) {
    const list = byAccount.get(r.account_id) ?? [];
    list.push({ date: r.date, amount: Number(r.amount) });
    byAccount.set(r.account_id, list);
  }
  return months.map((month) => {
    const end = monthRange(month).end; // exclusive
    let total = 0;
    for (const a of counted) {
      const tx = byAccount.get(a.id) ?? [];
      const started = a.created_at.slice(0, 7) <= month || tx.some((t) => t.date < end);
      if (!started) continue;
      const balance = Number(a.opening_balance) + tx.filter((t) => t.date < end).reduce((s, t) => s + t.amount, 0);
      total += toBase(balance, a.currency, rates) ?? 0;
    }
    return { month, netWorth: round(total) };
  });
}
