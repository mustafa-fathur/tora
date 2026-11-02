"use server";

import { refresh } from "next/cache";

import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import type { AccountClass, CategoryKind } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

// Creates or renames a category. Without a parent it's a group.
export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const icon = optional(fd, "icon");
  const parentId = optional(fd, "parent_id");
  const kind = str(fd, "kind") as CategoryKind;

  if (!name) return fail("Give it a name.");
  if (name.length > 60) return fail("Name is too long (60 characters max).");
  if (icon && [...icon].length > 4) return fail("Use a single emoji as the icon.");

  const supabase = await createClient();

  if (id) {
    if (!isUuid(id)) return fail("Category not found.");
    const { error } = await supabase.from("categories").update({ name, icon }).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
  } else {
    let resolvedKind = kind;
    if (parentId) {
      if (!isUuid(parentId)) return fail("Choose a valid group.");
      const { data: parent } = await supabase
        .from("categories")
        .select("kind, parent_id")
        .eq("id", parentId)
        .single();
      if (!parent || parent.parent_id) return fail("Choose a valid group.");
      resolvedKind = parent.kind;
    } else if (!["expense", "income"].includes(kind)) {
      return fail("Choose expense or income.");
    }
    const { error } = await supabase
      .from("categories")
      .insert({ name, icon, parent_id: parentId, kind: resolvedKind, sort_order: 999 });
    if (error) return fail(dbErrorMessage(error));
  }

  refresh();
  return { status: "success" };
}

// Transactions keep their data but become uncategorized; budgets for it are removed.
// Deleting a group also deletes its categories.
export async function deleteCategory(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Category not found.");
  const supabase = await createClient();
  const { error: childError } = await supabase.from("categories").delete().eq("parent_id", id);
  if (childError) return fail(dbErrorMessage(childError));
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}

// Creates or edits an account type. The class (cash / investment / debt) can only
// change while no account uses the type, because debts are stored negative.
export async function saveAccountType(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const cls = str(fd, "class") as AccountClass;

  if (!name) return fail("Give it a name.");
  if (name.length > 40) return fail("Name is too long (40 characters max).");
  if (!["cash", "investment", "liability"].includes(cls)) return fail("Choose what kind of account it is.");

  const supabase = await createClient();
  if (id) {
    if (!isUuid(id)) return fail("Account type not found.");
    const { data: current } = await supabase.from("account_types").select("class").eq("id", id).single();
    if (!current) return fail("Account type not found.");
    if (current.class !== cls) {
      const { count } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("type_id", id);
      if (count) return fail(`Its kind can't change while ${count} account${count > 1 ? "s use" : " uses"} it.`);
    }
    const { error } = await supabase.from("account_types").update({ name, class: cls }).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { error } = await supabase.from("account_types").insert({ name, class: cls, sort_order: 999 });
    if (error) return fail(dbErrorMessage(error));
  }

  refresh();
  return { status: "success" };
}

export async function deleteAccountType(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Account type not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("account_types").delete().eq("id", id);
  if (error?.code === "23503") return fail("Some accounts still use this type. Change their type first.");
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}

// Saves exchange rates typed by hand: fields named rate_<CODE> (1 CODE = x IDR).
export async function saveRates(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("rate_")) continue;
    const currency = key.slice(5);
    if (!/^[A-Z]{3}$/.test(currency) || currency === "IDR") continue;
    const raw = String(value).trim();
    if (raw === "") {
      await supabase.from("exchange_rates").delete().eq("currency", currency);
      continue;
    }
    const rate = Number(raw.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) return fail(`The rate for ${currency} isn't a valid number.`);
    const { error } = await supabase
      .from("exchange_rates")
      .upsert({ currency, rate, source: "manual" }, { onConflict: "user_id,currency" });
    if (error) return fail(dbErrorMessage(error));
  }
  refresh();
  return { status: "success" };
}

// Fetches today's rates from open.er-api.com (free, no key) for the given currencies.
// Docs: https://www.exchangerate-api.com/docs/free
export async function fetchRates(currencies: string[]): Promise<ActionState> {
  const wanted = currencies.filter((c) => /^[A-Z]{3}$/.test(c) && c !== "IDR");
  if (!wanted.length) return fail("No foreign currencies to update.");
  let rates: Record<string, number>;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/IDR", { cache: "no-store" });
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (!res.ok || body.result !== "success" || !body.rates) throw new Error("bad response");
    rates = body.rates; // 1 IDR = x CODE
  } catch {
    return fail("Couldn't reach the exchange rate service. Try again later or enter rates by hand.");
  }
  const rows = wanted
    .filter((c) => rates[c] > 0)
    .map((c) => ({ currency: c, rate: Math.round((1 / rates[c]) * 1e6) / 1e6, source: "api" }));
  const supabase = await createClient();
  const { error } = await supabase.from("exchange_rates").upsert(rows, { onConflict: "user_id,currency" });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success", message: `Updated ${rows.length} rate${rows.length === 1 ? "" : "s"}.` };
}
