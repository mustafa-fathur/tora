import { CircleAlert, CircleCheck, Lightbulb } from "lucide-react";

import type { Insight } from "@/lib/finance/insights";
import { cn } from "@/lib/utils";

export function InsightList({ items }: { items: Insight[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Add a few weeks of transactions and insights will show up here.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => {
        const Icon = i.tone === "good" ? CircleCheck : i.tone === "warning" ? CircleAlert : Lightbulb;
        return (
          <li key={i.title} className="flex gap-3">
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-4 shrink-0",
                i.tone === "good" ? "text-primary" : i.tone === "warning" ? "text-destructive" : "text-muted-foreground",
              )}
            />
            <div className="text-sm">
              <div className="font-medium">{i.title}</div>
              <div className="text-muted-foreground">{i.detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
