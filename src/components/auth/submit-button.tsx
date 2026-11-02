import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  pending,
  children,
  pendingText,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingText: string;
}) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </Button>
  );
}
