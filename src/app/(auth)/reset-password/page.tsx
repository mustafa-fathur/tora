import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "New password · Tora" };

// proxy.ts only lets signed-in users here; the reset email link signs you in.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
