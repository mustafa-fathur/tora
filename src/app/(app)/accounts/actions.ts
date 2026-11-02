"use server";

import { refresh } from "next/cache";

import { isLiability } from "@/lib/finance/accounts";
import { today } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import type { AccountClass } from "@/lib/finance/types";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Balances typed in the form are positive ("amount owed" for debts);
// debts are stored negative.
function signedBalance(raw: string, cls: AccountClass, currency: string) {
  if (raw === "" || raw === "0") return 0;
  const value = parseAmount(raw, currency);
  if (value === null) return null;
  return isLiability(cls) ? -value : value;
}

export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const typeId = str(fd, "type_id");
  let currency = str(fd, "currency") || "IDR";

  if (!name) return fail("Give the account a name.");
  if (name.length > 80) return fail("Name is too long (80 characters max).");
  if (!isUuid(typeId)) return fail("Choose an account type.");

  const supabase = await createClient();
  const { data: type } = await supabase.from("account_types").select("class").eq("id", typeId).single();
  if (!type) return fail("That account type no longer exists.");

  if (id) {
    // Moving between an asset and a debt type would flip the meaning of every amount.
    const { data: current } = await supabase
      .from("accounts")
      .select("currency, account_types(class)")
      .eq("id", id)
      .single();
    if (!current) return fail("Account not found.");
    if (current.account_types?.class !== type.class && (current.account_types?.class === "liability" || type.class === "liability")) {
      return fail("An account can't switch between a debt type and an asset type. Create a new account instead.");
    }
    currency = current.currency;
  }

  const openingBalance = signedBalance(str(fd, "opening_balance"), type.class, currency);
  if (openingBalance === null) return fail("Opening balance isn't a valid amount.");

  const fields = {
    name,
    type_id: typeId,
    opening_balance: openingBalance,
    institution: optional(fd, "institution"),
    include_in_net_worth: fd.get("include_in_net_worth") === "on",
  };

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
    supabase.from("accounts").select("currency, account_types(class)").eq("id", id).single(),
    supabase.from("account_balances").select("balance").eq("account_id", id).single(),
  ]);
  if (!account || !bal || !account.account_types) return fail("Account not found.");

  const target = signedBalance(str(fd, "balance"), account.account_types.class, account.currency);
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
