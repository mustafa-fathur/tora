"use server";

import { redirect } from "next/navigation";

import { authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth/errors";
import { getOrigin } from "@/lib/auth/origin";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  email?: string;
};

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: "error", message: authErrorMessage(error), code: error.code, email };
  }
  redirect("/dashboard");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm-password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, email };
  }
  if (password !== confirm) {
    return { status: "error", message: "Passwords don't match.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/dashboard` },
  });
  if (error) {
    return { status: "error", message: authErrorMessage(error), code: error.code, email };
  }
  // When the email is already registered, Supabase doesn't say so (to avoid leaking
  // which emails exist), so the success message covers both cases.
  return { status: "success", email };
}

export async function resendConfirmation(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/dashboard` },
  });
  if (error) return { status: "error", message: authErrorMessage(error), email };
  return { status: "success", email };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/confirm?next=/reset-password`,
  });
  // Only surface rate-limit/network problems; never reveal whether the email exists.
  if (error && (error.code?.startsWith("over_") || error.name === "AuthRetryableFetchError")) {
    return { status: "error", message: authErrorMessage(error), email };
  }
  return { status: "success", email };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm-password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { status: "error", message: "Passwords don't match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
