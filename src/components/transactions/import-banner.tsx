"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { undoImport } from "@/app/(app)/transactions/import/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";

// Shown on /transactions?import=… after a CSV import.
export function ImportBanner({ importId, count }: { importId: string; count: number }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-accent px-4 py-3 text-sm text-accent-foreground">
      <span className="flex-1">
        Reviewing <strong>{count}</strong> imported transaction{count === 1 ? "" : "s"}. Click a row to set its category.
      </span>
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={count === 0}>
        <Undo2 /> Undo import
      </Button>
      <Button asChild size="sm">
        <Link href="/transactions">Done</Link>
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Undo this import?"
        description={`Deletes the ${count} transactions from this import, including any edits you made to them.`}
        confirmLabel="Undo import"
        onConfirm={async () => {
          const r = await undoImport(importId);
          if (r.status === "success") router.replace("/transactions");
          return r;
        }}
      />
    </div>
  );
}
