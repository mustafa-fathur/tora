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
  uncategorized?: boolean;
  importId?: string;
  limit?: number;
  q?: string;
};

// Transactions matching the filters, newest first (capped by `limit`, default 1000).
export async function getTransactions(f: TransactionFilters): Promise<Transaction[]> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await transactionsQuery(supabase, f).limit(f.limit ?? 1000);
  if (error) throw error;
  return data;
}

// Every matching transaction, without the 1000-row cap (for exports).
export async function getAllTransactions(f: TransactionFilters): Promise<Transaction[]> {
  await connection();
  const supabase = await createClient();
  return fetchAll((from, to) => transactionsQuery(supabase, f).order("id").range(from, to));
}

function transactionsQuery(supabase: Awaited<ReturnType<typeof createClient>>, f: TransactionFilters) {
  let query = supabase
    .from("transactions")
    .select("*")
    .gte("date", f.start)
    .lt("date", f.end)
    .order("date", { ascending: false })
    .order("time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (f.accountId) query = query.eq("account_id", f.accountId);
  if (f.uncategorized) query = query.is("category_id", null).eq("kind", "regular");
  else if (f.categoryIds?.length) query = query.in("category_id", f.categoryIds);
  if (f.importId) query = query.eq("import_id", f.importId);
  if (f.q) {
    const term = f.q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }
  return query;
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

// The Supabase API returns at most 1000 rows per request; this pages through all of them.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export type TxSlim = Pick<Transaction, "id" | "account_id" | "amount" | "date" | "kind" | "category_id" | "description">;

// Light rows for totals and charts. `end` is exclusive.
export async function getTransactionsBetween(start: string, end: string): Promise<TxSlim[]> {
  await connection();
  const supabase = await createClient();
  return fetchAll((from, to) =>
    supabase
      .from("transactions")
      .select("id, account_id, amount, date, kind, category_id, description")
      .gte("date", start)
      .lt("date", end)
      .order("date")
      .order("id")
      .range(from, to),
  );
}

// Every transaction's account, date and amount (for net worth history).
export async function getBalanceMovements(until: string) {
  await connection();
  const supabase = await createClient();
  return fetchAll((from, to) =>
    supabase
      .from("transactions")
      .select("account_id, date, amount")
      .lt("date", until)
      .order("date")
      .order("id")
      .range(from, to),
  );
}

export const getRates = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("exchange_rates").select("*").order("currency");
  if (error) throw error;
  return data;
});

export async function getRateMap(): Promise<Record<string, number>> {
  return Object.fromEntries((await getRates()).map((r) => [r.currency, Number(r.rate)]));
}

export async function getBudgets(month: string) {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets").select("category_id, amount").eq("month", `${month}-01`);
  if (error) throw error;
  return new Map(data.map((b) => [b.category_id, Number(b.amount)]));
}

export const getRecurringItems = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_items")
    .select("*")
    .order("is_active", { ascending: false })
    .order("next_due_date");
  if (error) throw error;
  return data;
});

export const getGoals = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("is_archived")
    .order("target_date", { nullsFirst: false })
    .order("created_at");
  if (error) throw error;
  return data;
});

// Everything the signed-in user owns, for "Export everything".
export async function getEverything() {
  await connection();
  const supabase = await createClient();
  const table = <T>(name: "accounts" | "account_types" | "categories" | "budgets" | "recurring_items" | "goals" | "exchange_rates" | "profiles") =>
    fetchAll<T>((from, to) => supabase.from(name).select("*").range(from, to) as unknown as PromiseLike<{ data: T[] | null; error: unknown }>);
  const [profile, accounts, accountTypes, categories, budgets, recurring, goals, rates, transactions] = await Promise.all([
    table("profiles"),
    table("accounts"),
    table("account_types"),
    table("categories"),
    table("budgets"),
    table("recurring_items"),
    table("goals"),
    table("exchange_rates"),
    getAllTransactions({ start: "1900-01-01", end: "9999-12-31" }),
  ]);
  return {
    profile: profile[0] ?? null,
    accounts,
    account_types: accountTypes,
    categories,
    transactions,
    budgets,
    recurring_items: recurring,
    goals,
    exchange_rates: rates,
  };
}
