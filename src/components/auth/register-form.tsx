"use client";

import Link from "next/link";
import { useActionState } from "react";

import { register, type FormState } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/errors";

const idle: FormState = { status: "idle" };

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, idle);

  if (state.status === "success") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{state.email}</strong>. Open it to
            activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldDescription className="text-center">
            Already confirmed, or had an account before? <Link href="/login">Log in</Link>
          </FieldDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start tracking where your money goes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
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
              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm</FieldLabel>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                  />
                </Field>
              </Field>
              <FieldDescription>At least {MIN_PASSWORD_LENGTH} characters.</FieldDescription>
            </Field>
            <Field>
              <SubmitButton pending={pending} pendingText="Creating account…">
                Create account
              </SubmitButton>
              <FieldDescription className="text-center">
                Already have an account? <Link href="/login">Log in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
