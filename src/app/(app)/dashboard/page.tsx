import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Dashboard · Tora" };

export default function DashboardPage() {
  return (
    <ComingSoon phase="I">
      Your net worth, this month&apos;s cash flow, budget status, upcoming bills and recent transactions, all on one screen.
    </ComingSoon>
  );
}
