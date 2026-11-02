"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { login, resendConfirmation, type FormState } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LINK_ERRORS } from "@/lib/auth/errors";

const idle: FormState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, idle);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to see your money at a glance.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {state.status === "error" ? (
              <FormAlert variant="error">{state.message}</FormAlert>
            ) : (
              <LinkErrorAlert />
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
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field>
              <SubmitButton pending={pending} pendingText="Logging in…">
                Log in
              </SubmitButton>
            </Field>
          </FieldGroup>
        </form>
        {state.code === "email_not_confirmed" && state.email && (
          <ResendConfirmation email={state.email} />
        )}
      </CardContent>
    </Card>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, idle);

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      {state.status === "success" && (
        <FormAlert variant="success">New confirmation email sent to {email}.</FormAlert>
      )}
      {state.status === "error" && <FormAlert variant="error">{state.message}</FormAlert>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Resend confirmation email"}
      </Button>
    </form>
  );
}

// Shows ?error=… set by /auth/confirm. Read in the browser after load so the
// login page stays fully static (useSearchParams would defer the whole form).
function LinkErrorAlert() {
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL
    setMessage(code ? LINK_ERRORS[code] : undefined);
  }, []);
  return message ? <FormAlert variant="error">{message}</FormAlert> : null;
}
