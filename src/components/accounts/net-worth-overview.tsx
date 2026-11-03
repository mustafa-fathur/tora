import { RangeSwitcher } from "@/components/app/range-switcher";
import { MissingRatesNote } from "@/components/app/stat";
import { NetWorthChart } from "@/components/charts/charts";
import { formatMoney } from "@/lib/money";

export type Composition = { cash: number; investment: number; debts: number }; // debts as a positive amount

// Headline net worth, change over the period, an owned-vs-owed bar and the trend.
export function NetWorthOverview({
  netWorth,
  change,
  months,
  composition,
  history,
  missing,
  action,
}: {
  netWorth: number;
  change: number;
  months: number;
  composition: Composition;
  history: { month: string; netWorth: number }[];
  missing: string[];
  action: React.ReactNode;
}) {
  const { cash, investment, debts } = composition;
  const total = cash + investment + debts;
  const pct = (v: number) => (total > 0 ? `${(v / total) * 100}%` : "0%");

  return (
    <section aria-label="Net worth" className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Net worth</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(netWorth)}</span>
          <span className={`text-sm tabular-nums ${change < 0 ? "text-destructive" : "text-primary"}`}>
            {formatMoney(change, "IDR", { signed: true })}
            <span className="text-muted-foreground"> over {months} months</span>
          </span>
        </div>
        {action}
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="What you own versus what you owe">
            <div className="bg-chart-1" style={{ width: pct(cash) }} />
            <div className="bg-chart-3" style={{ width: pct(investment) }} />
            <div className="bg-chart-expense" style={{ width: pct(debts) }} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <Legend className="bg-chart-1" label="Cash & bank" value={cash} />
            <Legend className="bg-chart-3" label="Investments & property" value={investment} />
            <Legend className="bg-chart-expense" label="Debts" value={debts} />
          </div>
        </div>
      )}
      <MissingRatesNote currencies={missing} />

      <div className="flex flex-col gap-3">
        <RangeSwitcher value={months} options={[3, 6, 12]} />
        <NetWorthChart data={history} height="h-48" />
      </div>
    </section>
  );
}

function Legend({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden />
      {label} <span className="font-medium text-foreground tabular-nums">{formatMoney(value)}</span>
    </span>
  );
}
