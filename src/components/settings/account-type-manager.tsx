"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteAccountType, saveAccountType } from "@/app/(app)/settings/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormError, useSaveAction } from "@/components/app/form-bits";
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
import { ACCOUNT_CLASSES } from "@/lib/finance/accounts";
import type { AccountClass, AccountType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

// usage: how many accounts use each type id
export function AccountTypeManager({ types, usage }: { types: AccountType[]; usage: Record<string, number> }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {ACCOUNT_CLASSES.map((c) => (
        <div key={c.value} className="flex flex-col rounded-xl border bg-card">
          <div className="border-b px-4 py-2.5">
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.hint}</div>
          </div>
          <ul className="flex-1 divide-y">
            {types
              .filter((t) => t.class === c.value)
              .map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-1.5 pr-2 pl-4 text-sm">
                  <span className="flex-1">{t.name}</span>
                  {usage[t.id] ? (
                    <span className="text-xs text-muted-foreground">
                      {usage[t.id]} account{usage[t.id] > 1 && "s"}
                    </span>
                  ) : null}
                  <TypeActions type={t} inUse={Boolean(usage[t.id])} />
                </li>
              ))}
          </ul>
          <div className="px-2 py-1.5">
            <TypeFormDialog
              defaultClass={c.value}
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Plus /> Add type
                </Button>
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeActions({ type, inUse }: { type: AccountType; inUse: boolean }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="flex">
      <TypeFormDialog
        type={type}
        inUse={inUse}
        trigger={
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${type.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${type.name}`}
        onClick={() => setDeleting(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${type.name}?`}
        description={
          inUse
            ? "Some accounts use this type. Give them another type first, then delete it."
            : "It isn't used by any account."
        }
        onConfirm={() => deleteAccountType(type.id)}
      />
    </div>
  );
}

function TypeFormDialog({
  type,
  inUse,
  defaultClass,
  trigger,
}: {
  type?: AccountType;
  inUse?: boolean;
  defaultClass?: AccountClass;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{type ? "Edit account type" : "New account type"}</DialogTitle>
          <DialogDescription>For example Deposito, Gold, Paylater or Cooperative savings.</DialogDescription>
        </DialogHeader>
        <TypeForm type={type} inUse={inUse} defaultClass={defaultClass} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TypeForm({
  type,
  inUse,
  defaultClass,
  onDone,
}: {
  type?: AccountType;
  inUse?: boolean;
  defaultClass?: AccountClass;
  onDone: () => void;
}) {
  const [state, action, pending] = useSaveAction(saveAccountType, onDone);
  const [cls, setCls] = useState<AccountClass>(type?.class ?? defaultClass ?? "cash");
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        {type && <input type="hidden" name="id" value={type.id} />}
        <input type="hidden" name="class" value={cls} />
        <Field>
          <FieldLabel htmlFor="type-name">Name</FieldLabel>
          <Input id="type-name" name="name" defaultValue={type?.name} required autoFocus maxLength={40} />
        </Field>
        <Field>
          <FieldLabel id="class-label">Kind</FieldLabel>
          <div role="radiogroup" aria-labelledby="class-label" className="flex flex-col gap-1.5">
            {ACCOUNT_CLASSES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={cls === c.value}
                disabled={inUse && c.value !== type?.class}
                onClick={() => setCls(c.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                  cls === c.value ? "border-primary bg-accent" : "hover:bg-muted",
                )}
              >
                <span className="font-medium">{c.title}</span>
                <span className="block text-xs text-muted-foreground">{c.hint}</span>
              </button>
            ))}
          </div>
          {inUse && <FieldDescription>The kind is locked while accounts use this type.</FieldDescription>}
        </Field>
        <SubmitButton pending={pending} pendingText="Saving…">
          Save
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
