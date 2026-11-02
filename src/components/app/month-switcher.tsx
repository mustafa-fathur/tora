"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/finance/dates";

// ◀ November 2026 ▶ — keeps other query params. Render inside <Suspense>.
export function MonthSwitcher({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = (delta: number) => {
    const next = new URLSearchParams(params);
    next.set("month", shiftMonth(month, delta));
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => go(-1)}>
        <ChevronLeft />
      </Button>
      <h2 className="min-w-36 text-center text-lg font-semibold">{formatMonth(month)}</h2>
      <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => go(1)}>
        <ChevronRight />
      </Button>
    </div>
  );
}
