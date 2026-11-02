import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Cash flow · Tora" };

export default function CashFlowPage() {
  return (
    <ComingSoon phase="I">
      Income versus spending each month, broken down by category.
    </ComingSoon>
  );
}
