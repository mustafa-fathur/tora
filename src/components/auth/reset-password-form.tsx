"use client";

import { useActionState } from "react";

import { updatePassword, type FormState } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/errors";

const idle: FormState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>You&apos;ll stay signed in after saving it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {state.status === "error" && (
              <FormAlert variant="error">{state.message}</FormAlert>
            )}
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              <FieldDescription>At least {MIN_PASSWORD_LENGTH} characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <PasswordInput
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </Field>
            <SubmitButton pending={pending} pendingText="Saving…">
              Save password
            </SubmitButton>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
