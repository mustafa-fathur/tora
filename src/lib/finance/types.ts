import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type AccountType = Database["public"]["Enums"]["account_type"];
export type CategoryKind = Database["public"]["Enums"]["category_kind"];
export type TransactionKind = Database["public"]["Enums"]["transaction_kind"];

export type Account = Tables["accounts"]["Row"] & { balance: number };
export type Category = Tables["categories"]["Row"];
export type CategoryGroup = Category & { children: Category[] };
export type Transaction = Tables["transactions"]["Row"];
export type Currency = Tables["currencies"]["Row"];
