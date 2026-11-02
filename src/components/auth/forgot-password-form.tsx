"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type FormState } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const idle: FormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {state.status === "success" && (
              <FormAlert variant="success">
                If an account exists for <strong>{state.email}</strong>, a reset link is on
                its way. Check your inbox.
              </FormAlert>
            )}
            {state.status === "error" && (
              <FormAlert variant="error">{state.message}</FormAlert>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
              />
            </Field>
            <Field>
              <SubmitButton pending={pending} pendingText="Sending link…">
                {state.status === "success" ? "Send again" : "Send reset link"}
              </SubmitButton>
              <FieldDescription className="text-center">
                Remembered it? <Link href="/login">Back to log in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
