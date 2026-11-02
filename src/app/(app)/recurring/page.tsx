import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Recurring · Tora" };

export default function RecurringPage() {
  return (
    <ComingSoon phase="J">
      Bills, subscriptions and salary, with what is due next.
    </ComingSoon>
  );
}
