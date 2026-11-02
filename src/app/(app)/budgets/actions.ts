"use server";

import { refresh } from "next/cache";

import { isMonth, shiftMonth } from "@/lib/finance/dates";
import { type ActionState, dbErrorMessage, fail, isUuid, str } from "@/lib/finance/form";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Sets (or clears, when empty) the budget for one category or group in a month.
export async function setBudget(_: ActionState, fd: FormData): Promise<ActionState> {
  const categoryId = str(fd, "category_id");
  const month = str(fd, "month");
  const raw = str(fd, "amount");
  if (!isUuid(categoryId) || !isMonth(month)) return fail("Something's off. Refresh and try again.");

  const supabase = await createClient();
  if (raw === "" || raw === "0") {
    const { error } = await supabase.from("budgets").delete().eq("category_id", categoryId).eq("month", `${month}-01`);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const amount = parseAmount(raw, "IDR");
    if (amount === null) return fail("Enter a valid amount, or leave it empty to remove the budget.");
    const { error } = await supabase
      .from("budgets")
      .upsert({ category_id: categoryId, month: `${month}-01`, amount }, { onConflict: "user_id,category_id,month" });
    if (error) return fail(dbErrorMessage(error));
  }
  refresh();
  return { status: "success" };
}

// Copies last month's budgets into `month` (existing budgets in `month` are kept).
export async function copyBudgets(month: string): Promise<ActionState> {
  if (!isMonth(month)) return fail("Invalid month.");
  const supabase = await createClient();
  const { data: previous, error } = await supabase
    .from("budgets")
    .select("category_id, amount")
    .eq("month", `${shiftMonth(month, -1)}-01`);
  if (error) return fail(dbErrorMessage(error));
  if (!previous.length) return fail("Last month has no budgets to copy.");
  const { error: insertError } = await supabase
    .from("budgets")
    .upsert(
      previous.map((b) => ({ category_id: b.category_id, amount: b.amount, month: `${month}-01` })),
      { onConflict: "user_id,category_id,month", ignoreDuplicates: true },
    );
  if (insertError) return fail(dbErrorMessage(insertError));
  refresh();
  return { status: "success" };
}
