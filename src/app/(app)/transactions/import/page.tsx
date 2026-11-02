import type { Metadata } from "next";
import { Suspense } from "react";

import { CsvImport } from "@/components/transactions/csv-import";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccounts } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Import CSV · Tora" };

export default function ImportPage() {
  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">Import a bank statement</h2>
        <p className="text-sm text-muted-foreground">
          Download a CSV from your bank&apos;s internet banking or app, then bring it in here.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-md rounded-xl" />}>
        <Importer />
      </Suspense>
    </>
  );
}

async function Importer() {
  return <CsvImport accounts={await getAccounts()} />;
}
