"use client";

import { useActionState } from "react";

import { logout, verifyTwoFactor, type FormState } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const idle: FormState = { status: "idle" };

export function TwoFactorForm() {
  const [state, action, pending] = useActionState(verifyTwoFactor, idle);
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Enter your code</CardTitle>
        <CardDescription>Open your authenticator app and enter the 6-digit code for Tora.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={action}>
          <FieldGroup>
            {state.status === "error" && <FormAlert variant="error">{state.message}</FormAlert>}
            <Field>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                placeholder="123 456"
                className="text-center text-lg tracking-[0.3em] tabular-nums"
                required
                autoFocus
              />
            </Field>
            <SubmitButton pending={pending} pendingText="Checking…">
              Verify
            </SubmitButton>
          </FieldGroup>
        </form>
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
            Use a different account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
