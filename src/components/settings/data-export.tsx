import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

// Downloads of the user's own data. Not a substitute for database backups.
export function DataExport() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <ExportRow
        title="All transactions (CSV)"
        detail="Opens in Excel, Google Sheets or Numbers. One row per transaction, with account, category and amount."
        href="/export/transactions?all=1"
      />
      <ExportRow
        title="Everything (JSON)"
        detail="Accounts, categories, transactions, budgets, recurring items, goals and settings in one file: your own copy of your data."
        href="/export/all"
      />
      <p className="text-xs text-muted-foreground">
        Exports are a personal copy. They don&apos;t replace automatic database backups.
      </p>
    </div>
  );
}

function ExportRow({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-48 flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{detail}</div>
      </div>
      <Button asChild variant="outline">
        <a href={href} download>
          <Download /> Download
        </a>
      </Button>
    </div>
  );
}
