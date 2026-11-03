import type { Metadata } from "next";

import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = { title: "Two-factor code · Tora" };

// proxy.ts only lets signed-in users who still owe a 2FA code in here.
export default function TwoFactorPage() {
  return <TwoFactorForm />;
}
