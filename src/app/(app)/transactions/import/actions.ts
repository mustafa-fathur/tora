"use server";

import { refresh } from "next/cache";

import { isIsoDate } from "@/lib/finance/dates";
import { type ActionState, fail, isUuid } from "@/lib/finance/form";
import { createClient } from "@/lib/supabase/server";

export type ImportRow = { date: string; description: string; amount: number };
export type ImportResult = ActionState & { importId?: string; count?: number; categorized?: number };

const MAX_ROWS = 3000;

// Inserts parsed CSV rows into one account as a single import (undoable).
// Each row gets the category last used for the same description, if any.
export async function importTransactions(accountId: string, rows: ImportRow[]): Promise<ImportResult> {
  if (!isUuid(accountId)) return fail("Choose an account.");
  if (!Array.isArray(rows) || rows.length === 0) return fail("Nothing to import.");
  if (rows.length > MAX_ROWS) return fail(`Import at most ${MAX_ROWS} rows at a time.`);
  for (const r of rows) {
    if (!isIsoDate(r.date) || typeof r.amount !== "number" || !Number.isFinite(r.amount) || r.amount === 0) {
      return fail("Some rows have an invalid date or amount. Go back and check the preview.");
    }
  }

  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("id").eq("id", accountId).single();
  if (!account) return fail("That account no longer exists.");

  // Learn categories from past transactions with the same description.
  const { data: past } = await supabase
    .from("transactions")
    .select("description, category_id")
    .not("category_id", "is", null)
    .not("description", "is", null)
    .order("date", { ascending: false })
    .limit(2000);
  const learned = new Map<string, string>();
  for (const p of past ?? []) {
    const key = p.description!.toLowerCase().trim();
    if (!learned.has(key)) learned.set(key, p.category_id!);
  }
  const { data: categories } = await supabase.from("categories").select("id, kind");
  const kindOf = new Map((categories ?? []).map((c) => [c.id, c.kind]));

  const importId = crypto.randomUUID();
  let categorized = 0;
  const inserts = rows.map((r) => {
    const amount = Math.round(r.amount * 100) / 100;
    const guess = learned.get(r.description.toLowerCase().trim());
    // Only reuse a category if its kind matches the money direction (or it's a refund).
    const category_id =
      guess && (kindOf.get(guess) === "expense" || (kindOf.get(guess) === "income" && amount > 0)) ? guess : null;
    if (category_id) categorized++;
    return {
      account_id: accountId,
      date: r.date,
      description: r.description.slice(0, 200) || null,
      amount,
      category_id,
      import_id: importId,
    };
  });

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabase.from("transactions").insert(inserts.slice(i, i + 500));
    if (error) {
      await supabase.from("transactions").delete().eq("import_id", importId); // all or nothing
      return fail("Couldn't import. Nothing was saved. Please try again.");
    }
  }
  refresh();
  return { status: "success", importId, count: inserts.length, categorized };
}

export async function undoImport(importId: string): Promise<ActionState> {
  if (!isUuid(importId)) return fail("Import not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("import_id", importId);
  if (error) return fail("Couldn't undo the import. Please try again.");
  refresh();
  return { status: "success" };
}

// Existing transactions in an account between two dates, for duplicate checks.
export async function existingForDuplicates(accountId: string, start: string, end: string) {
  if (!isUuid(accountId) || !isIsoDate(start) || !isIsoDate(end)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("date, amount, description")
    .eq("account_id", accountId)
    .gte("date", start)
    .lte("date", end)
    .limit(5000);
  return (data ?? []).map((t) => ({ date: t.date, amount: Number(t.amount), description: t.description }));
}
