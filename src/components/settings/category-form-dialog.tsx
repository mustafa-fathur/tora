"use client";

import { useState } from "react";

import { saveCategory } from "@/app/(app)/settings/actions";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Category, CategoryKind } from "@/lib/finance/types";

type Props = {
  category?: Category; // rename when set
  parent?: Category; // add a category inside this group
  kind?: CategoryKind; // add a new group of this kind
  trigger: React.ReactNode;
};

export function CategoryFormDialog({ trigger, ...props }: Props) {
  const [open, setOpen] = useState(false);
  const isGroup = props.category ? !props.category.parent_id : !props.parent;
  const title = props.category
    ? `Edit ${isGroup ? "group" : "category"}`
    : props.parent
      ? `New category in ${props.parent.name}`
      : `New ${props.kind} group`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Name{isGroup && " and icon"}.</DialogDescription>
        </DialogHeader>
        <CategoryForm {...props} isGroup={isGroup} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  parent,
  kind,
  isGroup,
  onDone,
}: Omit<Props, "trigger"> & { isGroup: boolean; onDone: () => void }) {
  const [state, action, pending] = useSaveAction(saveCategory, onDone);
  return (
    <form action={action}>
      <FieldGroup>
        <FormError state={state} />
        {category && <input type="hidden" name="id" value={category.id} />}
        {parent && <input type="hidden" name="parent_id" value={parent.id} />}
        {kind && <input type="hidden" name="kind" value={kind} />}
        <div className="flex gap-3">
          {isGroup && (
            <Field className="w-20">
              <FieldLabel htmlFor="icon">Icon</FieldLabel>
              <Input id="icon" name="icon" defaultValue={category?.icon ?? ""} placeholder="🙂" className="text-center" />
            </Field>
          )}
          <Field className="flex-1">
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" defaultValue={category?.name} required autoFocus maxLength={60} />
          </Field>
        </div>
        <SubmitButton pending={pending} pendingText="Saving…">
          Save
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
