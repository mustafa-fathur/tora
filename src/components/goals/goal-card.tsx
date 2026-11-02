"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, PiggyBank, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { addToGoal, deleteGoal, saveGoal, setGoalArchived } from "@/app/(app)/goals/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { Meter } from "@/components/app/stat";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDay } from "@/lib/finance/dates";
import type { Account } from "@/lib/finance/types";
import type { Database } from "@/lib/supabase/database.types";
import { formatMoney } from "@/lib/money";

export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type GoalView = Goal & { saved: number; perMonth: number | null };

export function GoalCard({ goal, accounts }: { goal: GoalView; accounts: Account[] }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const target = Number(goal.target_amount);
  const ratio = target > 0 ? goal.saved / target : 0;
  const done = goal.saved >= target;
  const account = accounts.find((a) => a.id === goal.account_id);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{goal.name}</div>
          <div className="truncate text-sm text-muted-foreground">
            {[account ? `From ${account.name}` : "Saved by hand", goal.target_date && `by ${formatDay(goal.target_date)}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Options for ${goal.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => startTransition(() => setGoalArchived(goal.id, !goal.is_archived))}>
              {goal.is_archived ? <ArchiveRestore /> : <Archive />} {goal.is_archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-baseline justify-between gap-2 tabular-nums">
        <span className="text-xl font-semibold">{formatMoney(goal.saved, goal.currency)}</span>
        <span className="text-sm text-muted-foreground">of {formatMoney(target, goal.currency)}</span>
      </div>
      <Meter ratio={ratio} />
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={done ? "font-medium text-primary" : "text-muted-foreground"}>
          {done
            ? "Goal reached 🎉"
            : goal.perMonth !== null
              ? `Save ${formatMoney(goal.perMonth, goal.currency)}/month to make it`
              : `${Math.round(ratio * 100)}% there`}
        </span>
        {!goal.account_id && !done && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <PiggyBank /> Add money
          </Button>
        )}
      </div>

      <GoalFormDialog goal={goal} accounts={accounts} open={editing} onOpenChange={setEditing} />
      {adding && <AddMoneyDialog goal={goal} open onOpenChange={setAdding} />}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${goal.name}?`}
        description="The linked account and its money aren't affected."
        onConfirm={() => deleteGoal(goal.id)}
      />
    </div>
  );
}

export function GoalFormDialog({
  goal,
  accounts,
  trigger,
  open: o,
  onOpenChange,
}: {
  goal?: Goal;
  accounts: Account[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [own, setOwn] = useState(false);
  const open = o ?? own;
  const setOpen = onOpenChange ?? setOwn;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>An emergency fund, a trip, a new laptop…</DialogDescription>
        </DialogHeader>
        <GoalForm goal={goal} accounts={accounts} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ goal, accounts, onDone }: { goal?: Goal; accounts: Account[]; onDone: () => void }) {
  const [state, action, pending] = useSaveAction(saveGoal, onDone);
  const [accountId, setAccountId] = useState(goal?.account_id ?? "none");
  const assetAccounts = accounts.filter((a) => a.class !== "liability" && (!a.is_archived || a.id === accountId));
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        {goal && <input type="hidden" name="id" value={goal.id} />}
        <input type="hidden" name="account_id" value={accountId === "none" ? "" : accountId} />
        <Field>
          <FieldLabel htmlFor="g-name">Name</FieldLabel>
          <Input id="g-name" name="name" defaultValue={goal?.name} placeholder="e.g. Emergency fund" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field>
            <FieldLabel htmlFor="g-target">Target amount</FieldLabel>
            <Input id="g-target" name="target_amount" inputMode="decimal" defaultValue={goal ? Number(goal.target_amount) : ""} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-date">Target date (optional)</FieldLabel>
            <Input id="g-date" name="target_date" type="date" defaultValue={goal?.target_date ?? ""} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="g-account">Track progress with</FieldLabel>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="g-account" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Money I add by hand</SelectItem>
              {assetAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  Balance of {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Linking a savings account or pocket keeps progress up to date automatically.</FieldDescription>
        </Field>
        {accountId === "none" && (
          <Field>
            <FieldLabel htmlFor="g-saved">Saved so far</FieldLabel>
            <Input id="g-saved" name="saved_amount" inputMode="decimal" defaultValue={goal ? Number(goal.saved_amount) : ""} placeholder="0" />
          </Field>
        )}
        <SubmitButton pending={pending} pendingText="Saving…">
          {goal ? "Save changes" : "Create goal"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

function AddMoneyDialog({ goal, open, onOpenChange }: { goal: Goal; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, action, pending] = useSaveAction(addToGoal, () => onOpenChange(false));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add money to {goal.name}</DialogTitle>
          <DialogDescription>Only updates the goal; it doesn&apos;t move money between accounts.</DialogDescription>
        </DialogHeader>
        <form action={action}>
          <FieldGroup>
            <FormError state={state} />
            <input type="hidden" name="id" value={goal.id} />
            <Field>
              <FieldLabel htmlFor="add-amount">Amount</FieldLabel>
              <Input id="add-amount" name="amount" inputMode="decimal" required autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" name="direction" value="add" disabled={pending}>
                Add
              </Button>
              <Button type="submit" name="direction" value="withdraw" variant="outline" disabled={pending}>
                Take out
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
