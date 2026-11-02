"use client";

import { adjustBalance } from "@/app/(app)/accounts/actions";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isLiability } from "@/lib/finance/accounts";
import type { Account } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";

export function AdjustBalanceDialog({
  account,
  open,
  onOpenChange,
}: {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update balance</DialogTitle>
          <DialogDescription>
            Now {formatMoney(account.balance, account.currency)}. Tora records the difference as a
            balance update, which doesn&apos;t count as income or spending.
          </DialogDescription>
        </DialogHeader>
        <AdjustForm account={account} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AdjustForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const [state, action, pending] = useSaveAction(adjustBalance, onDone);
  const liability = isLiability(account.class);
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        <input type="hidden" name="id" value={account.id} />
        <Field>
          <FieldLabel htmlFor="balance">{liability ? "Amount owed now" : "Balance now"}</FieldLabel>
          <Input
            id="balance"
            name="balance"
            inputMode="decimal"
            defaultValue={Math.abs(account.balance)}
            required
            autoFocus
          />
          <FieldDescription>In {account.currency}. Use the value from your bank or app.</FieldDescription>
        </Field>
        <SubmitButton pending={pending} pendingText="Saving…">
          Update balance
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
