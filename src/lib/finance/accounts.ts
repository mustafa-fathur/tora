import type { AccountType } from "@/lib/finance/types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank account",
  e_wallet: "E-wallet",
  credit_card: "Credit card",
  loan: "Loan",
  investment: "Investment",
  property: "Property",
  other_asset: "Other asset",
  other_liability: "Other liability",
};

const LIABILITIES: AccountType[] = ["credit_card", "loan", "other_liability"];

// Liabilities are stored with negative balances (see docs/DATA-MODEL.md).
export const isLiability = (type: AccountType) => LIABILITIES.includes(type);

// Sections on the Accounts page, in display order.
export const ACCOUNT_SECTIONS: { title: string; types: AccountType[] }[] = [
  { title: "Cash & bank", types: ["cash", "bank", "e_wallet"] },
  { title: "Investments & property", types: ["investment", "property", "other_asset"] },
  { title: "Credit cards & loans", types: ["credit_card", "loan", "other_liability"] },
];
