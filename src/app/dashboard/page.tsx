import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · Tora" };

// Placeholder until the real dashboard (dashboard-01 block) lands.
export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Image src="/brand/tora-logo.png" alt="Tora logo" width={72} height={72} preload />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SignedInAs />
      </Suspense>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </main>
  );
}

// Reads the session cookie (request-time data), so it renders inside Suspense.
async function SignedInAs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (
    <p className="text-lg">
      Signed in as <strong className="text-primary">{data?.claims.email ?? "unknown"}</strong>
    </p>
  );
}
