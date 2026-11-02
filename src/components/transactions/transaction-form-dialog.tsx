"use client";

import Link from "next/link";
import { useState } from "react";

import { saveTransaction } from "@/app/(app)/transactions/actions";
import { CheckboxField, FormError, useSaveAction } from "@/components/app/form-bits";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { nowTime, today } from "@/lib/finance/dates";
import type { Account, CategoryGroup, Transaction } from "@/lib/finance/types";
import { formatMoney, parseAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

type Mode = "expense" | "income" | "transfer";

export type TransactionFormProps = {
  accounts: Account[];
  groups: CategoryGroup[];
  transaction?: Transaction; // edit a regular transaction
  transfer?: { out: Transaction; in: Transaction }; // edit a transfer
  defaultAccountId?: string;
};

type DialogProps = TransactionFormProps & {
  trigger?: React.ReactNode;
  footer?: React.ReactNode; // e.g. a delete button when editing
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TransactionFormDialog({ trigger, footer, open: o, onOpenChange, ...form }: DialogProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = o ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const editing = Boolean(form.transaction || form.transfer);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription className="sr-only">
            Amount, account, category and date of the transaction.
          </DialogDescription>
        </DialogHeader>
        {form.accounts.length === 0 ? (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Add an account first, so Tora knows where the money comes from.</p>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/accounts">Go to Accounts</Link>
            </Button>
          </div>
        ) : (
          <TransactionForm {...form} onDone={() => setOpen(false)} />
        )}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

function initialMode(form: TransactionFormProps): Mode {
  if (form.transfer) return "transfer";
  const t = form.transaction;
  if (!t) return "expense";
  const category = form.groups.flatMap((g) => [g, ...g.children]).find((c) => c.id === t.category_id);
  if (category) return category.kind;
  return Number(t.amount) > 0 ? "income" : "expense";
}

function TransactionForm(form: TransactionFormProps & { onDone: () => void }) {
  const { accounts, groups, transaction: t, transfer } = form;
  const editing = Boolean(t || transfer);
  const [state, action, pending] = useSaveAction(saveTransaction, form.onDone);

  const [mode, setMode] = useState<Mode>(() => initialMode(form));
  const [accountId, setAccountId] = useState(
    transfer?.out.account_id ?? t?.account_id ?? form.defaultAccountId ?? accounts[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(transfer?.in.account_id ?? "");
  const [categoryId, setCategoryId] = useState(t?.category_id ?? "none");
  const [amount, setAmount] = useState(() => {
    const v = transfer ? transfer.out.amount : t?.amount;
    return v ? String(Math.abs(Number(v))) : "";
  });
  const [date] = useState(() => transfer?.out.date ?? t?.date ?? today());
  const [time] = useState(() => {
    const existing = transfer ? transfer.out.time : t?.time;
    return editing ? (existing?.slice(0, 5) ?? "") : nowTime();
  });

  const selectable = accounts.filter(
    (a) => !a.is_archived || a.id === accountId || a.id === toAccountId,
  );
  const from = accounts.find((a) => a.id === accountId);
  const to = accounts.find((a) => a.id === toAccountId);
  const currency = from?.currency ?? "IDR";
  const parsed = parseAmount(amount, currency);
  const crossCurrency = mode === "transfer" && from && to && from.currency !== to.currency;
  const categoryGroups = groups.filter((g) => g.kind === (mode === "income" ? "income" : "expense"));

  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        <input type="hidden" name="mode" value={mode} />
        {t && <input type="hidden" name="id" value={t.id} />}
        {transfer && <input type="hidden" name="transfer_id" value={transfer.out.transfer_id ?? ""} />}

        {/* Expense / Income / Transfer switch. Editing can't switch to or from a transfer. */}
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(["expense", "income", "transfer"] as const).map((m) => {
            const locked = editing && (m === "transfer") !== (mode === "transfer");
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={locked}
                onClick={() => {
                  setMode(m);
                  setCategoryId("none");
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors disabled:opacity-40",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>

        <Field>
          <FieldLabel htmlFor="amount">Amount{currency !== "IDR" && ` (${currency})`}</FieldLabel>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg font-medium tabular-nums"
            required
            autoFocus
          />
          <FieldDescription className="tabular-nums">
            {amount ? (parsed ? formatMoney(parsed, currency) : "Not a valid amount") : " "}
          </FieldDescription>
        </Field>

        <div className={cn("grid gap-4 [&>*]:min-w-0", mode === "transfer" && "grid-cols-2")}>
          <AccountSelect
            id="account_id"
            label={mode === "transfer" ? "From" : "Account"}
            accounts={selectable}
            value={accountId}
            onChange={setAccountId}
          />
          {mode === "transfer" && (
            <AccountSelect
              id="to_account_id"
              label="To"
              accounts={selectable.filter((a) => a.id !== accountId)}
              value={toAccountId}
              onChange={setToAccountId}
            />
          )}
        </div>

        {crossCurrency && (
          <Field>
            <FieldLabel htmlFor="to_amount">Amount received ({to.currency})</FieldLabel>
            <Input
              id="to_amount"
              name="to_amount"
              inputMode="decimal"
              defaultValue={transfer ? String(Math.abs(Number(transfer.in.amount))) : ""}
              required
            />
          </Field>
        )}

        {mode !== "transfer" && (
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <input type="hidden" name="category_id" value={categoryId === "none" ? "" : categoryId} />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categoryGroups.map((g) => (
                  <SelectGroup key={g.id}>
                    <SelectLabel>
                      {g.icon} {g.name}
                    </SelectLabel>
                    <SelectItem value={g.id}>All of {g.name}</SelectItem>
                    {g.children
                      .filter((c) => !c.is_archived || c.id === categoryId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {mode === "expense" && (
          <CheckboxField
            name="refund"
            label="This is a refund"
            description="Money back for something you bought. It lowers your spending."
            defaultChecked={Boolean(t && Number(t.amount) > 0)}
          />
        )}

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
          <Field>
            <FieldLabel htmlFor="date">Date</FieldLabel>
            <Input id="date" name="date" type="date" defaultValue={date} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="time">Time (optional)</FieldLabel>
            <Input id="time" name="time" type="time" defaultValue={time} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            name="description"
            placeholder={mode === "transfer" ? "Optional" : "e.g. Lunch at warung"}
            defaultValue={(transfer ? transfer.out.description : t?.description) ?? ""}
            maxLength={200}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={(transfer ? transfer.out.notes : t?.notes) ?? ""}
            maxLength={1000}
          />
        </Field>

        <SubmitButton pending={pending} pendingText="Saving…">
          {editing ? "Save changes" : "Add transaction"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

function AccountSelect({
  id,
  label,
  accounts,
  value,
  onChange,
}: {
  id: string;
  label: string;
  accounts: Account[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={id} value={value} onValueChange={onChange} required>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
              {a.currency !== "IDR" && ` (${a.currency})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
