import { formatCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  short,
  tone,
  hint,
  className,
}: {
  label: string;
  value: string;
  short?: string; // shown instead of `value` on narrow phones
  tone?: "positive" | "negative";
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card px-3 py-3 sm:px-4", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "truncate text-base font-semibold tabular-nums sm:text-lg",
          tone === "negative" && "text-destructive",
          tone === "positive" && "text-primary",
        )}
      >
        {short ? (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="max-sm:hidden">{value}</span>
          </>
        ) : (
          value
        )}
      </div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

// Thin progress bar coloured by status (ok / warning / over).
export function Meter({ ratio, status }: { ratio: number; status?: "ok" | "warning" | "over" | null }) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          status === "over" ? "bg-destructive" : status === "warning" ? "bg-warning" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MissingRatesNote({ currencies }: { currencies: string[] }) {
  if (!currencies.length) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {currencies.join(", ")} amounts aren&apos;t included yet: add exchange rates in Settings → Exchange rates.
    </p>
  );
}

// "Rp 4,6 jt" / "+Rp 400 rb" for tight spaces (IDR).
export function shortMoney(amount: number, signed = false) {
  const sign = amount < 0 ? "-" : signed && amount > 0 ? "+" : "";
  return `${sign}Rp ${formatCompact(amount)}`;
}
