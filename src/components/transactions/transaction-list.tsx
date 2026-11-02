"use client";

import { ArrowLeftRight, Scale } from "lucide-react";
import { useState } from "react";

import { deleteTransaction } from "@/app/(app)/transactions/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/finance/dates";
import type { Account, Category, CategoryGroup, Transaction } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  transactions: Transaction[]; // rows to show (already filtered)
  partners: Transaction[]; // other legs of transfers, for editing
  accounts: Account[];
  groups: CategoryGroup[];
};

export function TransactionList({ transactions, partners, accounts, groups }: Props) {
  const [editing, setEditing] = useState<Transaction | null>(null);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map<string, Category>(
    groups.flatMap((g) => [g, ...g.children]).map((c) => [c.id, c]),
  );
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const legs = [...transactions, ...partners];

  const days = new Map<string, Transaction[]>();
  for (const t of transactions) days.set(t.date, [...(days.get(t.date) ?? []), t]);

  const transferOf = (t: Transaction) => {
    const pair = legs.filter((l) => l.transfer_id === t.transfer_id);
    const out = pair.find((l) => Number(l.amount) < 0);
    const inn = pair.find((l) => Number(l.amount) > 0);
    return out && inn ? { out, in: inn } : undefined;
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {[...days].map(([day, rows]) => (
          <section key={day} aria-label={formatDay(day)}>
            <h2 className="mb-1 px-1 text-sm font-medium text-muted-foreground">{formatDay(day)}</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {rows.map((t) => {
                const account = accountById.get(t.account_id);
                const category = t.category_id ? categoryById.get(t.category_id) : undefined;
                const group = category?.parent_id ? groupById.get(category.parent_id) : category;
                const amount = Number(t.amount);
                const title =
                  t.description ||
                  category?.name ||
                  (t.kind === "adjustment" ? "Balance update" : "Uncategorized");
                const subtitle = [
                  t.time?.slice(0, 5),
                  t.kind === "transfer"
                    ? "Transfer"
                    : t.kind === "adjustment"
                      ? "Balance update"
                      : t.description
                        ? (category?.name ?? "Uncategorized")
                        : null,
                  account?.name,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                    >
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base"
                      >
                        {t.kind === "transfer" ? (
                          <ArrowLeftRight className="size-4 text-muted-foreground" />
                        ) : t.kind === "adjustment" ? (
                          <Scale className="size-4 text-muted-foreground" />
                        ) : (
                          (group?.icon ?? "•")
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{title}</span>
                        <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular-nums",
                          amount > 0 && t.kind === "regular" && "text-primary",
                          t.kind !== "regular" && "text-muted-foreground",
                        )}
                      >
                        {formatMoney(amount, account?.currency, { signed: true })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {editing && editing.kind === "adjustment" ? (
        <AdjustmentDialog transaction={editing} onClose={() => setEditing(null)} />
      ) : editing ? (
        <TransactionFormDialog
          key={editing.id}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          accounts={accounts}
          groups={groups}
          transaction={editing.kind === "regular" ? editing : undefined}
          transfer={editing.kind === "transfer" ? transferOf(editing) : undefined}
          footer={
            <DeleteButton transaction={editing} onDeleted={() => setEditing(null)} />
          }
        />
      ) : null}
    </>
  );
}

function DeleteButton({ transaction, onDeleted }: { transaction: Transaction; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        Delete transaction
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this transaction?"
        description={
          transaction.kind === "transfer"
            ? "Both sides of the transfer will be deleted. This can't be undone."
            : "This can't be undone."
        }
        onConfirm={async () => {
          const result = await deleteTransaction(transaction.id, transaction.transfer_id);
          if (result.status === "success") onDeleted();
          return result;
        }}
      />
    </>
  );
}

function AdjustmentDialog({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Delete this balance update?"
      description="Balance updates can't be edited. Delete it and update the balance again from Accounts if needed."
      onConfirm={async () => {
        const result = await deleteTransaction(transaction.id, null);
        if (result.status === "success") onClose();
        return result;
      }}
    />
  );
}
