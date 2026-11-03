"use client";

import { ChevronLeft, ChevronRight, Download, FileUp, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNCATEGORIZED } from "@/lib/data/transaction-filters";
import { formatMonth, shiftMonth } from "@/lib/finance/dates";
import type { Account, CategoryGroup } from "@/lib/finance/types";

export type FilterValues = { month: string; account?: string; category?: string; q?: string };

// Month switcher + filters. State lives in the URL (?month=&account=&category=&q=).
export function TransactionFilters({
  values,
  accounts,
  groups,
  exportHref,
}: {
  values: FilterValues;
  accounts: Account[];
  groups: CategoryGroup[];
  exportHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const go = (next: Partial<FilterValues>) => {
    const merged = { ...values, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  const filtered = Boolean(values.account || values.category || values.q);

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex items-center gap-1">
        <div className="order-last ml-auto flex gap-2">
          {/* On wide screens, export lives in the summary panel. */}
          <Button asChild variant="outline" size="sm" className="lg:hidden">
            <a href={exportHref} download aria-label="Export CSV">
              <Download /> <span className="max-sm:sr-only">Export</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/transactions/import">
              <FileUp /> <span className="max-sm:sr-only">Import CSV</span>
            </Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => go({ month: shiftMonth(values.month, -1) })}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-36 text-center text-lg font-semibold">{formatMonth(values.month)}</h2>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => go({ month: shiftMonth(values.month, 1) })}>
          <ChevronRight />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <form
          className="relative w-full sm:w-auto sm:min-w-48 sm:flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() || undefined });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            key={values.q ?? ""}
            defaultValue={values.q}
            placeholder="Search description or notes"
            className="pl-8"
            aria-label="Search transactions"
          />
        </form>
        <Select value={values.account ?? "all"} onValueChange={(v) => go({ account: v === "all" ? undefined : v })}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none" aria-label="Filter by account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={values.category ?? "all"} onValueChange={(v) => go({ category: v === "all" ? undefined : v })}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
            {groups.map((g) => (
              <SelectGroup key={g.id}>
                <SelectLabel>
                  {g.icon} {g.name}
                </SelectLabel>
                {[g, ...g.children].map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id === g.id ? `All of ${g.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={() => go({ account: undefined, category: undefined, q: undefined })}>
            <X /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
