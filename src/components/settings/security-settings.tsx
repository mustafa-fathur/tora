"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  cancelTotpEnrollment,
  confirmTotpEnrollment,
  type EnrollResult,
  removeTotp,
  startTotpEnrollment,
} from "@/app/(app)/settings/security-actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Factor = { id: string; name: string; createdAt: string };

export function SecuritySettings({ factors }: { factors: Factor[] }) {
  const [setup, setSetup] = useState<EnrollResult | null>(null);
  const [removing, setRemoving] = useState<Factor | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const begin = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await startTotpEnrollment();
      if (r.status === "error") setError(r.message);
      else setSetup(r);
    });

  const cancel = () => {
    if (setup?.factorId) void cancelTotpEnrollment(setup.factorId);
    setSetup(null);
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className={factors.length ? "mt-0.5 size-5 text-primary" : "mt-0.5 size-5 text-muted-foreground"} aria-hidden />
          <div className="flex-1">
            <h3 className="font-medium">Two-factor login</h3>
            <p className="text-sm text-muted-foreground">
              {factors.length
                ? "On. After your password, Tora asks for a code from your authenticator app."
                : "Off. Add an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password…) so a stolen password isn't enough to get in."}
            </p>
          </div>
        </div>

        {factors.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1">
                  {f.name}
                  <span className="block text-xs text-muted-foreground">
                    Added {new Date(f.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </span>
                <Button variant="ghost" size="icon" aria-label={`Remove ${f.name}`} onClick={() => setRemoving(f)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && <FormAlert variant="error">{error}</FormAlert>}
        {!setup && (
          <Button variant={factors.length ? "outline" : "default"} onClick={begin} disabled={pending} className="w-fit">
            {pending ? "Preparing…" : factors.length ? "Add another authenticator" : "Set up authenticator app"}
          </Button>
        )}
        {setup?.factorId && <SetupSteps setup={setup} onDone={() => setSetup(null)} onCancel={cancel} />}
      </section>

      <p className="text-xs text-muted-foreground">
        There are no backup codes. If you might lose your phone, add a second authenticator (another phone, or a
        password manager) or keep the setup key somewhere safe.
      </p>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        description={
          factors.length === 1
            ? "This turns two-factor login off. Only your password will be needed."
            : "You can still log in with your other authenticator."
        }
        confirmLabel="Remove"
        onConfirm={() => removeTotp(removing!.id)}
      />
    </div>
  );
}

function SetupSteps({ setup, onDone, onCancel }: { setup: EnrollResult; onDone: () => void; onCancel: () => void }) {
  const [state, action, pending] = useSaveAction(confirmTotpEnrollment, onDone);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-dashed p-4">
      <FieldGroup>
        <FormError state={state} />
        <input type="hidden" name="factor_id" value={setup.factorId} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* QR code is an SVG data URL from Supabase; next/image adds nothing here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code to scan with your authenticator app" className="size-44 rounded-md border bg-white p-2" />
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <strong>1.</strong> Scan this QR code with your authenticator app.
            </p>
            <p className="text-muted-foreground">Can&apos;t scan? Enter this setup key instead:</p>
            <code data-testid="totp-secret" className="w-fit rounded bg-muted px-2 py-1 font-mono text-xs break-all select-all">
              {setup.secret}
            </code>
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="setup-code">2. Enter the 6-digit code it shows</FieldLabel>
          <Input
            id="setup-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="max-w-40 tracking-[0.3em] tabular-nums"
            required
            autoFocus
          />
          <FieldDescription>Codes change every 30 seconds.</FieldDescription>
        </Field>
        <div className="flex gap-2">
          <SubmitButton pending={pending} pendingText="Checking…">
            Turn on
          </SubmitButton>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
