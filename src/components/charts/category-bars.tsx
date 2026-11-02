import Link from "next/link";

import type { CategoryTotal } from "@/lib/finance/cashflow";
import { formatMoney } from "@/lib/money";

// Horizontal bars per category group, largest first. Optional link per row.
export function CategoryBars({
  items,
  total,
  href,
  empty = "Nothing here yet.",
  limit,
  tone = "expense",
}: {
  items: CategoryTotal[];
  total: number;
  href?: (item: CategoryTotal) => string;
  empty?: string;
  limit?: number;
  tone?: "expense" | "income";
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.amount));
  return (
    <ul className="flex flex-col gap-3">
      {items.slice(0, limit).map((i) => {
        const row = (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span aria-hidden className="w-5 text-center">{i.icon ?? "•"}</span>
              <span className="flex-1 truncate">{i.name}</span>
              <span className="text-muted-foreground tabular-nums">{total > 0 ? Math.round((i.amount / total) * 100) : 0}%</span>
              <span className="w-28 text-right font-medium tabular-nums">{formatMoney(i.amount)}</span>
            </div>
            <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${tone === "income" ? "bg-chart-income" : "bg-chart-expense"}`} style={{ width: `${max > 0 ? (i.amount / max) * 100 : 0}%` }} />
            </div>
          </>
        );
        return (
          <li key={i.id}>
            {href && i.id !== "uncategorized" ? (
              <Link href={href(i)} className="flex flex-col gap-1 rounded-md outline-none hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50">
                {row}
              </Link>
            ) : (
              <div className="flex flex-col gap-1">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
