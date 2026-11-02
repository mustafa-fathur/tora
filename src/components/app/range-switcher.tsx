"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

export function RangeSwitcher({ value, options }: { value: number; options: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <div role="radiogroup" aria-label="Period" aria-busy={pending} className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => startTransition(() => router.replace(`${pathname}?months=${o}`, { scroll: false }))}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o} months
        </button>
      ))}
    </div>
  );
}
