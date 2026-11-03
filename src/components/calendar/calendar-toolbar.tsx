"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CALENDAR_VIEWS, type CalendarView } from "@/lib/finance/calendar";
import { today } from "@/lib/finance/dates";
import { cn } from "@/lib/utils";

export function CalendarToolbar({
  view,
  title,
  prev,
  next,
  focus,
}: {
  view: CalendarView;
  title: string;
  prev: string;
  next: string;
  focus: string; // date kept when switching views
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const go = (v: CalendarView, date: string) =>
    startTransition(() => router.replace(`${pathname}?view=${v}&date=${date}`, { scroll: false }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3" aria-busy={pending}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={`Previous ${view}`} onClick={() => go(view, prev)}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-40 text-center text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" aria-label={`Next ${view}`} onClick={() => go(view, next)}>
          <ChevronRight />
        </Button>
        <Button variant="outline" size="sm" className="ml-1" onClick={() => go(view, today())}>
          Today
        </Button>
      </div>
      <div role="radiogroup" aria-label="Calendar view" className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {CALENDAR_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => go(v, focus)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
