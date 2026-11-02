import { connection } from "next/server";
import { cache } from "react";

import type { Account, AccountType, Category, CategoryGroup, Transaction } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

// Read helpers for Server Components. RLS limits every query to the signed-in
// user. cache() dedupes calls within one request (e.g. layout + page).

export const getAccountTypes = cache(async (): Promise<AccountType[]> => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_types")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
});

export const getAccounts = cache(async (): Promise<Account[]> => {
  await connection();
  const supabase = await createClient();
  const [accounts, balances, types] = await Promise.all([
    supabase.from("accounts").select("*").order("sort_order").order("created_at"),
    supabase.from("account_balances").select("account_id, balance"),
    getAccountTypes(),
  ]);
  if (accounts.error) throw accounts.error;
  if (balances.error) throw balances.error;
  const balanceOf = new Map(balances.data.map((b) => [b.account_id, Number(b.balance ?? 0)]));
  const typeOf = new Map(types.map((t) => [t.id, t]));
  return accounts.data.map((a) => ({
    ...a,
    balance: balanceOf.get(a.id) ?? Number(a.opening_balance),
    type_name: typeOf.get(a.type_id)?.name ?? "Account",
    class: typeOf.get(a.type_id)?.class ?? "cash",
  }));
});

export const getCategories = cache(async (): Promise<Category[]> => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
});

// Groups (no parent) with their categories, in display order.
export function toCategoryGroups(categories: Category[]): CategoryGroup[] {
  const groups = categories
    .filter((c) => !c.parent_id)
    .map((g) => ({ ...g, children: [] as Category[] }));
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const c of categories) {
    if (c.parent_id) byId.get(c.parent_id)?.children.push(c);
  }
  return groups;
}

export type TransactionFilters = {
  start: string;
  end: string; // exclusive
  accountId?: string;
  categoryIds?: string[]; // a category, or a group plus its categories
  q?: string;
};

export async function getTransactions(f: TransactionFilters): Promise<Transaction[]> {
  await connection();
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .gte("date", f.start)
    .lt("date", f.end)
    .order("date", { ascending: false })
    .order("time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (f.accountId) query = query.eq("account_id", f.accountId);
  if (f.categoryIds?.length) query = query.in("category_id", f.categoryIds);
  if (f.q) {
    const term = f.q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export const getCurrencies = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("currencies").select("*").order("code");
  if (error) throw error;
  // IDR first, then alphabetical.
  return [...data].sort((a, b) => (a.code === "IDR" ? -1 : b.code === "IDR" ? 1 : 0));
});

// The other legs of transfers in `rows` that aren't in `rows` themselves.
export async function getTransferPartners(rows: Transaction[]): Promise<Transaction[]> {
  const ids = new Set(rows.map((r) => r.id));
  const transferIds = [...new Set(rows.flatMap((r) => (r.transfer_id ? [r.transfer_id] : [])))];
  if (transferIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select("*").in("transfer_id", transferIds);
  if (error) throw error;
  return data.filter((t) => !ids.has(t.id));
}
