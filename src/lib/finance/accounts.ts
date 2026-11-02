import type { AccountClass } from "@/lib/finance/types";

// Account classes drive behavior; account types (user-managed) belong to one.
export const ACCOUNT_CLASSES: { value: AccountClass; title: string; hint: string }[] = [
  { value: "cash", title: "Cash & bank", hint: "Money you can spend: cash, bank accounts, e-wallets" },
  { value: "investment", title: "Investments & property", hint: "Things you own that hold value" },
  { value: "liability", title: "Debts", hint: "Money you owe: credit cards, paylater, loans" },
];

export const classTitle = (c: AccountClass) => ACCOUNT_CLASSES.find((x) => x.value === c)!.title;

// Debts are stored with negative balances (see docs/DATA-MODEL.md).
export const isLiability = (c: AccountClass) => c === "liability";
