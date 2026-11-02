"use server";

import { refresh } from "next/cache";

import { ACCOUNT_TYPE_LABELS, isLiability } from "@/lib/finance/accounts";
import { today } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import type { AccountType } from "@/lib/finance/types";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Balances typed in the form are positive ("amount owed" for liabilities);
// liabilities are stored negative.
function signedBalance(raw: string, type: AccountType, currency: string) {
  if (raw === "" || raw === "0") return 0;
  const value = parseAmount(raw, currency);
  if (value === null) return null;
  return isLiability(type) ? -value : value;
}

export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const type = str(fd, "type") as AccountType;
  const currency = str(fd, "currency") || "IDR";

  if (!name) return fail("Give the account a name.");
  if (name.length > 80) return fail("Name is too long (80 characters max).");
  if (!(type in ACCOUNT_TYPE_LABELS)) return fail("Choose an account type.");

  const openingBalance = signedBalance(str(fd, "opening_balance"), type, currency);
  if (openingBalance === null) return fail("Opening balance isn't a valid amount.");

  const fields = {
    name,
    type,
    opening_balance: openingBalance,
    institution: optional(fd, "institution"),
    include_in_net_worth: fd.get("include_in_net_worth") === "on",
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("accounts").update(fields).eq("id", id)
    : await supabase.from("accounts").insert({ ...fields, currency });
  if (error) return fail(dbErrorMessage(error));

  refresh();
  return { status: "success" };
}

// Sets the balance to a new value by recording an adjustment transaction for
// the difference (used for investments, property, or reconciling with the bank).
export async function adjustBalance(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  if (!isUuid(id)) return fail("Account not found.");

  const supabase = await createClient();
  const [{ data: account }, { data: bal }] = await Promise.all([
    supabase.from("accounts").select("type, currency").eq("id", id).single(),
    supabase.from("account_balances").select("balance").eq("account_id", id).single(),
  ]);
  if (!account || !bal) return fail("Account not found.");

  const target = signedBalance(str(fd, "balance"), account.type, account.currency);
  if (target === null) return fail("New balance isn't a valid amount.");

  const diff = Math.round((target - Number(bal.balance ?? 0)) * 100) / 100;
  if (diff === 0) return { status: "success" };

  const { error } = await supabase.from("transactions").insert({
    account_id: id,
    kind: "adjustment",
    amount: diff,
    date: today(),
    description: "Balance update",
  });
  if (error) return fail(dbErrorMessage(error));

  refresh();
  return { status: "success" };
}

export async function setAccountArchived(id: string, archived: boolean) {
  if (!isUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("accounts").update({ is_archived: archived }).eq("id", id);
  refresh();
}

export async function deleteAccount(id: string): Promise<ActionState> {
  if (!isUuid(id)) return fail("Account not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { status: "success" };
}
