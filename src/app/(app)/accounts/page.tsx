import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Accounts · Tora" };

export default function AccountsPage() {
  return (
    <ComingSoon phase="G">
      Cash, bank accounts, e-wallets, credit cards, loans and investments, each with its own balance and currency.
    </ComingSoon>
  );
}
