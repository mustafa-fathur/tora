import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Reports · Tora" };

export default function ReportsPage() {
  return (
    <ComingSoon phase="K">
      Spending trends, net worth over time and insights about your money.
    </ComingSoon>
  );
}
