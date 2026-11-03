import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export type SummaryNumbers = {
  count: number;
  income: number;
  spending: number;
  net: number;
  largest: { label: string; amount: number } | null;
  averageExpense: number | null;
};

// Side panel on wide screens: totals for what's listed, plus CSV export.
export function TransactionSummary({ s, exportHref }: { s: SummaryNumbers; exportHref: string }) {
  const row = (label: string, value: string, tone?: string) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium tabular-nums ${tone ?? ""}`}>{value}</dd>
    </div>
  );
  return (
    <section aria-label="Summary" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Summary</h2>
      <dl className="divide-y">
        {row("Income", formatMoney(s.income), "text-primary")}
        {row("Spending", formatMoney(s.spending))}
        {row("Net", formatMoney(s.net, "IDR", { signed: true }), s.net < 0 ? "text-destructive" : "text-primary")}
        {row("Transactions", String(s.count))}
        {s.largest && row("Largest expense", formatMoney(s.largest.amount))}
        {s.averageExpense !== null && row("Average expense", formatMoney(Math.round(s.averageExpense)))}
      </dl>
      {s.largest && <p className="-mt-2 truncate text-xs text-muted-foreground">Largest: {s.largest.label}</p>}
      <Button asChild variant="outline" size="sm">
        <a href={exportHref} download>
          <Download /> Export CSV
        </a>
      </Button>
    </section>
  );
}
