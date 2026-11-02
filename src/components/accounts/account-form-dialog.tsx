"use client";

import { useState } from "react";

import { saveAccount } from "@/app/(app)/accounts/actions";
import { CheckboxField, FormError, useSaveAction } from "@/components/app/form-bits";
import { SubmitButton } from "@/components/auth/submit-button";
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
import { ACCOUNT_CLASSES, isLiability } from "@/lib/finance/accounts";
import type { Account, AccountType, Currency } from "@/lib/finance/types";

type Props = {
  account?: Account; // edit mode when set
  currencies: Currency[];
  types: AccountType[];
  trigger?: React.ReactNode; // or control it with open/onOpenChange
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AccountFormDialog({ account, currencies, types, trigger, ...controlled }: Props) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlled.open ?? ownOpen;
  const setOpen = controlled.onOpenChange ?? setOwnOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Change the details. To change the balance, use “Update balance”."
              : "Anywhere you keep or owe money."}
          </DialogDescription>
        </DialogHeader>
        <AccountForm account={account} currencies={currencies} types={types} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  account,
  currencies,
  types,
  onDone,
}: Pick<Props, "account" | "currencies" | "types"> & { onDone: () => void }) {
  const [state, action, pending] = useSaveAction(saveAccount, onDone);
  // When editing, an account can't move between debts and assets (amounts would flip).
  const allowed = account
    ? types.filter((t) => isLiability(t.class) === isLiability(account.class))
    : types;
  const [typeId, setTypeId] = useState(
    account?.type_id ?? allowed.find((t) => t.name === "Bank account")?.id ?? allowed[0]?.id ?? "",
  );
  const liability = isLiability(types.find((t) => t.id === typeId)?.class ?? "cash");
  const opening = account ? Math.abs(Number(account.opening_balance)) : "";

  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        {account && <input type="hidden" name="id" value={account.id} />}
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" defaultValue={account?.name} placeholder="e.g. BCA, GoPay, Wallet" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="type_id">Type</FieldLabel>
            <Select name="type_id" value={typeId} onValueChange={setTypeId} required>
              <SelectTrigger id="type_id" className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_CLASSES.map((c) => {
                  const items = allowed.filter((t) => t.class === c.value);
                  if (items.length === 0) return null;
                  return (
                    <SelectGroup key={c.value}>
                      <SelectLabel>{c.title}</SelectLabel>
                      {items.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Select name="currency" defaultValue={account?.currency ?? "IDR"} disabled={Boolean(account)}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="opening_balance">
            {liability ? "Amount owed at start" : "Starting balance"}
          </FieldLabel>
          <Input
            id="opening_balance"
            name="opening_balance"
            inputMode="decimal"
            defaultValue={opening}
            placeholder="0"
          />
          <FieldDescription>
            {liability
              ? "How much you owed when you started tracking. Enter it as a positive number."
              : "The balance when you started tracking in Tora."}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="institution">Bank or provider (optional)</FieldLabel>
          <Input id="institution" name="institution" defaultValue={account?.institution ?? ""} />
        </Field>
        <CheckboxField
          name="include_in_net_worth"
          label="Include in net worth"
          defaultChecked={account?.include_in_net_worth ?? true}
        />
        <SubmitButton pending={pending} pendingText="Saving…">
          {account ? "Save changes" : "Add account"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
