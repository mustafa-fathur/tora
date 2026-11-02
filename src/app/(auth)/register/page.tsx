import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Invite only · Tora" };

// Public sign-ups are off in Supabase. New accounts come from invitations.
export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Tora is invite-only</CardTitle>
        <CardDescription>
          New accounts can&apos;t be created here. If you were invited, use the link in
          your invitation email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to log in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
