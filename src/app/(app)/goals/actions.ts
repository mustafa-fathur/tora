"use server";

import { refresh } from "next/cache";

import { isIsoDate } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export async function saveGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const accountId = optional(fd, "account_id");
  const targetDate = optional(fd, "target_date");

  if (!name) return fail("Give the goal a name.");
  if (name.length > 80) return fail("Name is too long.");
  if (accountId && !isUuid(accountId)) return fail("Choose a valid account.");
  if (targetDate && !isIsoDate(targetDate)) return fail("Pick a valid target date.");

  const supabase = await createClient();
  let currency = "IDR";
  if (accountId) {
    const { data: account } = await supabase.from("accounts").select("currency").eq("id", accountId).single();
    if (!account) return fail("That account no longer exists.");
    currency = account.currency;
  }
  const target = parseAmount(str(fd, "target_amount"), currency);
  if (target === null) return fail("Enter a target amount greater than zero.");
  const savedRaw = str(fd, "saved_amount");
  const saved = savedRaw === "" || savedRaw === "0" ? 0 : parseAmount(savedRaw, currency);
  if (saved === null) return fail("Saved so far isn't a valid amount.");

  const row = {
    name,
    target_amount: target,
    currency,
    target_date: targetDate,
    account_id: accountId,
    saved_amount: accountId ? 0 : saved,
  };
  const { error } = id
    ? await supabase.from("goals").update(row).eq("id", id)
    : await supabase.from("goals").insert(row);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}

// Adds (or with a minus sign, withdraws) money for goals without a linked account.
export async function addToGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const withdraw = str(fd, "direction") === "withdraw";
  if (!isUuid(id)) return fail("Goal not found.");
  const supabase = await createClient();
  const { data: goal } = await supabase.from("goals").select("saved_amount, currency").eq("id", id).single();
  if (!goal) return fail("Goal not found.");
  const amount = parseAmount(str(fd, "amount"), goal.currency);
  if (amount === null) return fail("Enter an amount greater than zero.");
  const next = Math.max(0, Number(goal.saved_amount) + (withdraw ? -amount : amount));
  const { error } = await supabase.from("goals").update({ saved_amount: next }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}

export async function setGoalArchived(id: string, archived: boolean) {
  if (!isUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("goals").update({ is_archived: archived }).eq("id", id);
  refresh();
}

export async function deleteGoal(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Goal not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}
