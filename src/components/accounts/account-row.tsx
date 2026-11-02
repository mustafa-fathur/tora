"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Scale, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteAccount, setAccountArchived } from "@/app/(app)/accounts/actions";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { AdjustBalanceDialog } from "@/components/accounts/adjust-balance-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/accounts";
import type { Account, Currency } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function AccountRow({ account, currencies }: { account: Account; currencies: Currency[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-3">
      <Link
        href={`/transactions?account=${account.id}`}
        className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{account.name}</span>
          {account.currency !== "IDR" && <Badge variant="outline">{account.currency}</Badge>}
          {!account.include_in_net_worth && <Badge variant="secondary">Not in net worth</Badge>}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {[account.institution, ACCOUNT_TYPE_LABELS[account.type]].filter(Boolean).join(" · ")}
        </div>
      </Link>
      <span className={cn("shrink-0 font-medium tabular-nums", account.balance < 0 && "text-destructive")}>
        {formatMoney(account.balance, account.currency)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Options for ${account.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAdjustOpen(true)}>
            <Scale /> Update balance
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => startTransition(() => setAccountArchived(account.id, !account.is_archived))}
          >
            {account.is_archived ? <ArchiveRestore /> : <Archive />}
            {account.is_archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountFormDialog
        account={account}
        currencies={currencies}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AdjustBalanceDialog account={account} open={adjustOpen} onOpenChange={setAdjustOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${account.name}?`}
        description={
          <>
            This also deletes <strong>all of its transactions</strong> and can&apos;t be undone. To
            hide it but keep its history, archive it instead.
          </>
        }
        onConfirm={() => deleteAccount(account.id)}
      />
    </li>
  );
}
