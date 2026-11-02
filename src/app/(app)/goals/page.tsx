import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Goals · Tora" };

export default function GoalsPage() {
  return (
    <ComingSoon phase="J">
      Savings targets with progress from a linked account.
    </ComingSoon>
  );
}
