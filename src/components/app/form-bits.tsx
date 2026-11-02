"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/auth/form-alert";
import { type ActionState, idle } from "@/lib/finance/form";

// useActionState that calls onDone() after a successful save (e.g. close a dialog).
// Mount it inside DialogContent so each opening starts fresh.
export function useSaveAction(
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>,
  onDone: () => void,
) {
  return useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.status === "success") onDone();
    return result;
  }, idle);
}

export function FormError({ state }: { state: ActionState }) {
  return state.status === "error" ? <FormAlert variant="error">{state.message}</FormAlert> : null;
}

// Native checkbox styled with the theme (shadcn checkbox isn't needed yet).
export function CheckboxField({
  name,
  label,
  defaultChecked,
  description,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        {label}
        {description && <span className="block text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}
