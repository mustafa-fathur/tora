"use server";

import { refresh } from "next/cache";

import { isIsoDate, isTime } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, optional, str } from "@/lib/finance/form";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

type Mode = "expense" | "income" | "transfer";

export async function saveTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id"); // regular transaction being edited
  const transferId = str(fd, "transfer_id"); // transfer being edited
  const mode = str(fd, "mode") as Mode;
  const date = str(fd, "date");
  const time = optional(fd, "time");
  const accountId = str(fd, "account_id");
  const description = optional(fd, "description");
  const notes = optional(fd, "notes");

  if (!["expense", "income", "transfer"].includes(mode)) return fail("Choose expense, income or transfer.");
  if (!isIsoDate(date)) return fail("Pick a valid date.");
  if (time && !isTime(time)) return fail("Pick a valid time, or leave it empty.");
  if (!isUuid(accountId)) return fail("Choose an account.");
  if (description && description.length > 200) return fail("Description is too long.");

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .eq("id", accountId)
    .single();
  if (!account) return fail("That account no longer exists.");

  const amount = parseAmount(str(fd, "amount"), account.currency);
  if (amount === null) return fail("Enter an amount greater than zero.");

  if (mode === "transfer") {
    const toId = str(fd, "to_account_id");
    if (!isUuid(toId)) return fail("Choose the account the money goes to.");
    if (toId === accountId) return fail("Pick two different accounts.");
    const { data: to } = await supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("id", toId)
      .single();
    if (!to) return fail("That account no longer exists.");

    // Different currencies need the amount that arrived, too.
    let received = amount;
    if (to.currency !== account.currency) {
      const parsed = parseAmount(str(fd, "to_amount"), to.currency);
      if (parsed === null) return fail(`Enter the amount received in ${to.currency}.`);
      received = parsed;
    }

    const legs = [
      {
        account_id: account.id,
        amount: -amount,
        description: description ?? `Transfer to ${to.name}`,
      },
      {
        account_id: to.id,
        amount: received,
        description: description ?? `Transfer from ${account.name}`,
      },
    ];

    if (transferId) {
      if (!isUuid(transferId)) return fail("Transfer not found.");
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, amount")
        .eq("transfer_id", transferId);
      const out = existing?.find((t) => Number(t.amount) < 0);
      const inn = existing?.find((t) => Number(t.amount) > 0);
      if (!out || !inn) return fail("Transfer not found.");
      for (const [row, leg] of [[out, legs[0]], [inn, legs[1]]] as const) {
        const { error } = await supabase
          .from("transactions")
          .update({ ...leg, date, time, notes })
          .eq("id", row.id);
        if (error) return fail(dbErrorMessage(error));
      }
    } else {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from("transactions").insert(
        legs.map((leg) => ({ ...leg, kind: "transfer" as const, transfer_id: newId, date, time, notes })),
      );
      if (error) return fail(dbErrorMessage(error));
    }
    refresh();
    return { status: "success" };
  }

  // Expense or income. A refund is money back into an expense category.
  const refund = mode === "expense" && fd.get("refund") === "on";
  const categoryId = optional(fd, "category_id");
  if (categoryId) {
    if (!isUuid(categoryId)) return fail("Choose a valid category.");
    const { data: category } = await supabase
      .from("categories")
      .select("kind")
      .eq("id", categoryId)
      .single();
    if (!category) return fail("That category no longer exists.");
    if (category.kind !== mode) return fail(`Pick an ${mode} category.`);
  }

  const row = {
    account_id: account.id,
    kind: "regular" as const,
    amount: mode === "income" || refund ? amount : -amount,
    date,
    time,
    description,
    notes,
    category_id: categoryId,
  };

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);
  if (error) return fail(dbErrorMessage(error));

  refresh();
  return { status: "success" };
}

// Deletes a transaction; for transfers, both legs.
export async function deleteTransaction(id: string, transferId: string | null): Promise<ActionState> {
  const supabase = await createClient();
  const query = supabase.from("transactions").delete();
  const { error } =
    transferId && isUuid(transferId)
      ? await query.eq("transfer_id", transferId)
      : isUuid(id)
        ? await query.eq("id", id)
        : { error: { message: "Not found" } };
  if (error) return fail("Couldn't delete. Please try again.");
  refresh();
  return { status: "success" };
}
