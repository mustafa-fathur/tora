import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  tone,
  hint,
  className,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card px-4 py-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "truncate text-base font-semibold tabular-nums sm:text-lg",
          tone === "negative" && "text-destructive",
          tone === "positive" && "text-primary",
        )}
      >
        {value}
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
