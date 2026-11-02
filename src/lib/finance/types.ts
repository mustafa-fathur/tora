import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type AccountClass = Database["public"]["Enums"]["account_class"];
export type CategoryKind = Database["public"]["Enums"]["category_kind"];
export type TransactionKind = Database["public"]["Enums"]["transaction_kind"];

export type AccountType = Tables["account_types"]["Row"];
// An account with its current balance and its type's name and class.
export type Account = Tables["accounts"]["Row"] & {
  balance: number;
  type_name: string;
  class: AccountClass;
};
export type Category = Tables["categories"]["Row"];
export type CategoryGroup = Category & { children: Category[] };
export type Transaction = Tables["transactions"]["Row"];
export type Currency = Tables["currencies"]["Row"];
