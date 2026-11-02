"use server";

import { refresh } from "next/cache";

import { isIsoDate } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import { type Frequency, nextDate } from "@/lib/finance/recurring";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "yearly"];

export async function saveRecurring(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const direction = str(fd, "direction"); // "expense" | "income"
  const accountId = str(fd, "account_id");
  const categoryId = optional(fd, "category_id");
  const frequency = str(fd, "frequency") as Frequency;
  const interval = Number(str(fd, "interval_count") || "1");
  const nextDue = str(fd, "next_due_date");
  const endDate = optional(fd, "end_date");

  if (!name) return fail("Give it a name, e.g. Internet or Salary.");
  if (name.length > 80) return fail("Name is too long.");
  if (!isUuid(accountId)) return fail("Choose an account.");
  if (categoryId && !isUuid(categoryId)) return fail("Choose a valid category.");
  if (!FREQUENCIES.includes(frequency)) return fail("Choose how often it repeats.");
  if (!Number.isInteger(interval) || interval < 1 || interval > 52) return fail("Repeat every 1–52.");
  if (!isIsoDate(nextDue)) return fail("Pick the next due date.");
  if (endDate && (!isIsoDate(endDate) || endDate < nextDue)) return fail("The end date must be after the next due date.");

  const supabase = await createClient();
  const { data: account } = await supabase.from("accounts").select("currency").eq("id", accountId).single();
  if (!account) return fail("That account no longer exists.");
  const amount = parseAmount(str(fd, "amount"), account.currency);
  if (amount === null) return fail("Enter an amount greater than zero.");

  const row = {
    name,
    amount: direction === "income" ? amount : -amount,
    account_id: accountId,
    category_id: categoryId,
    frequency,
    interval_count: interval,
    next_due_date: nextDue,
    end_date: endDate,
    notes: optional(fd, "notes"),
  };
  const { error } = id
    ? await supabase.from("recurring_items").update(row).eq("id", id)
    : await supabase.from("recurring_items").insert(row);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}

// Records this occurrence as a real transaction, then moves the due date forward.
export async function markPaid(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const date = str(fd, "date");
  if (!isUuid(id)) return fail("Not found.");
  if (!isIsoDate(date)) return fail("Pick a valid date.");

  const supabase = await createClient();
  const { data: item } = await supabase.from("recurring_items").select("*").eq("id", id).single();
  if (!item) return fail("Not found.");
  const { data: account } = await supabase.from("accounts").select("currency").eq("id", item.account_id).single();
  if (!account) return fail("Its account no longer exists.");
  const amount = parseAmount(str(fd, "amount"), account.currency);
  if (amount === null) return fail("Enter an amount greater than zero.");

  const { error } = await supabase.from("transactions").insert({
    account_id: item.account_id,
    amount: Number(item.amount) < 0 ? -amount : amount,
    date,
    description: item.name,
    category_id: item.category_id,
    recurring_item_id: item.id,
  });
  if (error) return fail(dbErrorMessage(error));
  return advance(item.id, item.next_due_date, item.frequency, item.interval_count, item.end_date);
}

// Moves to the next due date without recording a transaction.
export async function skipOccurrence(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Not found.");
  const supabase = await createClient();
  const { data: item } = await supabase.from("recurring_items").select("*").eq("id", id).single();
  if (!item) return fail("Not found.");
  return advance(item.id, item.next_due_date, item.frequency, item.interval_count, item.end_date);
}

async function advance(id: string, due: string, frequency: Frequency, interval: number, end: string | null) {
  const supabase = await createClient();
  const next = nextDate(due, frequency, interval);
  const finished = Boolean(end && next > end);
  const { error } = await supabase
    .from("recurring_items")
    .update(finished ? { is_active: false } : { next_due_date: next })
    .eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" } as ActionState;
}

export async function setRecurringActive(id: string, active: boolean) {
  if (!isUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("recurring_items").update({ is_active: active }).eq("id", id);
  refresh();
}

export async function deleteRecurring(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_items").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}
