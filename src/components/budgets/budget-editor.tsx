"use client";

import { Copy } from "lucide-react";
import { useState, useTransition } from "react";

import { copyBudgets, setBudget } from "@/app/(app)/budgets/actions";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatMonth } from "@/lib/finance/dates";
import { formatMoney } from "@/lib/money";

export function SetBudgetDialog({
  categoryId,
  name,
  month,
  current,
  spent,
  trigger,
}: {
  categoryId: string;
  name: string;
  month: string;
  current: number | null;
  spent: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Budget for {name}</DialogTitle>
          <DialogDescription>
            {formatMonth(month)}. Spent so far: {formatMoney(spent)}.
          </DialogDescription>
        </DialogHeader>
        <BudgetForm categoryId={categoryId} month={month} current={current} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({
  categoryId,
  month,
  current,
  onDone,
}: {
  categoryId: string;
  month: string;
  current: number | null;
  onDone: () => void;
}) {
  const [state, action, pending] = useSaveAction(setBudget, onDone);
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        <input type="hidden" name="category_id" value={categoryId} />
        <input type="hidden" name="month" value={month} />
        <Field>
          <FieldLabel htmlFor="budget-amount">Monthly budget (IDR)</FieldLabel>
          <Input id="budget-amount" name="amount" inputMode="decimal" defaultValue={current ?? ""} placeholder="e.g. 2.000.000" autoFocus />
          <FieldDescription>Leave empty to remove this budget.</FieldDescription>
        </Field>
        <SubmitButton pending={pending} pendingText="Saving…">
          Save budget
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

export function CopyBudgetsButton({ month }: { month: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await copyBudgets(month);
            setMessage(r.status === "error" ? r.message : undefined);
          })
        }
      >
        <Copy /> {pending ? "Copying…" : "Copy last month"}
      </Button>
      {message && <FormAlert variant="error">{message}</FormAlert>}
    </div>
  );
}
