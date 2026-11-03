"use server";

import { refresh } from "next/cache";

import { authErrorMessage } from "@/lib/auth/errors";
import { type ActionState, fail, isUuid, str } from "@/lib/finance/form";
import { createClient } from "@/lib/supabase/server";

// Two-factor login with an authenticator app (TOTP).
// Docs: https://supabase.com/docs/guides/auth/auth-mfa/totp

export type EnrollResult = ActionState & { factorId?: string; qr?: string; secret?: string };

export async function startTotpEnrollment(): Promise<EnrollResult> {
  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return fail(authErrorMessage(listError));

  // Clear half-finished setups, then pick an unused name.
  for (const f of factors.all) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const taken = new Set(factors.totp.map((f) => f.friendly_name));
  let name = "Authenticator";
  for (let i = 2; taken.has(name); i++) name = `Authenticator ${i}`;

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: name, issuer: "Tora" });
  if (error) return fail(authErrorMessage(error));
  return { status: "success", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

// Confirms setup with the first code from the app. The current session becomes 2FA-verified.
export async function confirmTotpEnrollment(_: ActionState, fd: FormData): Promise<ActionState> {
  const factorId = str(fd, "factor_id");
  const code = str(fd, "code").replace(/\s/g, "");
  if (!isUuid(factorId)) return fail("Start the setup again.");
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code shown in your authenticator app.");

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return fail(authErrorMessage(error));
  refresh();
  return { status: "success" };
}

export async function cancelTotpEnrollment(factorId: string) {
  if (!isUuid(factorId)) return;
  const supabase = await createClient();
  await supabase.auth.mfa.unenroll({ factorId });
}

export async function removeTotp(factorId: string): Promise<ActionState> {
  if (!isUuid(factorId)) return fail("Authenticator not found.");
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return fail(authErrorMessage(error));
  refresh();
  return { status: "success" };
}
