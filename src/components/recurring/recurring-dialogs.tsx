"use client";

import { useState } from "react";

import { markPaid, saveRecurring } from "@/app/(app)/recurring/actions";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { SubmitButton } from "@/components/auth/submit-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { today } from "@/lib/finance/dates";
import type { Account, CategoryGroup } from "@/lib/finance/types";
import type { Database } from "@/lib/supabase/database.types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type RecurringItem = Database["public"]["Tables"]["recurring_items"]["Row"];

type FormProps = { item?: RecurringItem; accounts: Account[]; groups: CategoryGroup[] };

export function RecurringFormDialog({
  trigger,
  open: o,
  onOpenChange,
  ...form
}: FormProps & { trigger?: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [own, setOwn] = useState(false);
  const open = o ?? own;
  const setOpen = onOpenChange ?? setOwn;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.item ? "Edit recurring item" : "Add recurring item"}</DialogTitle>
          <DialogDescription>A bill, subscription or income that repeats.</DialogDescription>
        </DialogHeader>
        <RecurringForm {...form} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RecurringForm({ item, accounts, groups, onDone }: FormProps & { onDone: () => void }) {
  const [state, action, pending] = useSaveAction(saveRecurring, onDone);
  const [direction, setDirection] = useState<"expense" | "income">(
    item && Number(item.amount) > 0 ? "income" : "expense",
  );
  const [accountId, setAccountId] = useState(item?.account_id ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? "none");
  const [frequency, setFrequency] = useState(item?.frequency ?? "monthly");
  const [nextDue] = useState(() => item?.next_due_date ?? today());
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "IDR";

  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        {item && <input type="hidden" name="id" value={item.id} />}
        <input type="hidden" name="direction" value={direction} />
        <input type="hidden" name="category_id" value={categoryId === "none" ? "" : categoryId} />
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["expense", "income"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => {
                setDirection(d);
                setCategoryId("none");
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                direction === d ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "expense" ? "Bill or subscription" : "Income"}
            </button>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="r-name">Name</FieldLabel>
          <Input id="r-name" name="name" defaultValue={item?.name} placeholder="e.g. Internet, Netflix, Salary" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field>
            <FieldLabel htmlFor="r-amount">Amount{currency !== "IDR" && ` (${currency})`}</FieldLabel>
            <Input id="r-amount" name="amount" inputMode="decimal" defaultValue={item ? Math.abs(Number(item.amount)) : ""} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="r-account">Account</FieldLabel>
            <Select name="account_id" value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger id="r-account" className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => !a.is_archived || a.id === accountId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="r-category">Category</FieldLabel>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="r-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {groups.filter((g) => g.kind === direction).map((g) => (
                <SelectGroup key={g.id}>
                  <SelectLabel>{g.icon} {g.name}</SelectLabel>
                  <SelectItem value={g.id}>All of {g.name}</SelectItem>
                  {g.children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <Field>
            <FieldLabel htmlFor="r-interval">Every</FieldLabel>
            <Input id="r-interval" name="interval_count" type="number" min={1} max={52} defaultValue={item?.interval_count ?? 1} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="r-frequency">Period</FieldLabel>
            <Select name="frequency" value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger id="r-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Day(s)</SelectItem>
                <SelectItem value="weekly">Week(s)</SelectItem>
                <SelectItem value="monthly">Month(s)</SelectItem>
                <SelectItem value="yearly">Year(s)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field>
            <FieldLabel htmlFor="r-next">Next due</FieldLabel>
            <Input id="r-next" name="next_due_date" type="date" defaultValue={nextDue} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="r-end">Ends (optional)</FieldLabel>
            <Input id="r-end" name="end_date" type="date" defaultValue={item?.end_date ?? ""} />
          </Field>
        </div>
        <SubmitButton pending={pending} pendingText="Saving…">
          {item ? "Save changes" : "Add recurring item"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

export function MarkPaidDialog({
  item,
  currency,
  open,
  onOpenChange,
}: {
  item: RecurringItem;
  currency: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record {item.name}</DialogTitle>
          <DialogDescription>
            Adds a transaction and moves the next due date forward. Due {item.next_due_date}, usually{" "}
            {formatMoney(Math.abs(Number(item.amount)), currency)}.
          </DialogDescription>
        </DialogHeader>
        <MarkPaidForm item={item} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidForm({ item, onDone }: { item: RecurringItem; onDone: () => void }) {
  const [state, action, pending] = useSaveAction(markPaid, onDone);
  const [date] = useState(() => {
    const t = today();
    return item.next_due_date < t ? item.next_due_date : t;
  });
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        <input type="hidden" name="id" value={item.id} />
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field>
            <FieldLabel htmlFor="p-amount">Amount</FieldLabel>
            <Input id="p-amount" name="amount" inputMode="decimal" defaultValue={Math.abs(Number(item.amount))} required autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="p-date">Date</FieldLabel>
            <Input id="p-date" name="date" type="date" defaultValue={date} required />
          </Field>
        </div>
        <SubmitButton pending={pending} pendingText="Saving…">
          {Number(item.amount) > 0 ? "Record income" : "Record payment"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
