import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Transactions · Tora" };

export default function TransactionsPage() {
  return (
    <ComingSoon phase="G">
      Add, edit and search your income and spending, including transfers between accounts.
    </ComingSoon>
  );
}
