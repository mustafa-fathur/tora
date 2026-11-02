import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Budgets · Tora" };

export default function BudgetsPage() {
  return (
    <ComingSoon phase="I">
      A monthly limit per category, with how much you have spent and what is left.
    </ComingSoon>
  );
}
