"use client";

import { Check, MoreHorizontal, Pause, Pencil, Play, SkipForward, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteRecurring, setRecurringActive, skipOccurrence } from "@/app/(app)/recurring/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { MarkPaidDialog, RecurringFormDialog, type RecurringItem } from "@/components/recurring/recurring-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDay } from "@/lib/finance/dates";
import { describeFrequency } from "@/lib/finance/recurring";
import type { Account, CategoryGroup } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function RecurringRow({
  item,
  accounts,
  groups,
  todayIso,
}: {
  item: RecurringItem;
  accounts: Account[];
  groups: CategoryGroup[];
  todayIso: string;
}) {
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const account = accounts.find((a) => a.id === item.account_id);
  const amount = Number(item.amount);
  const overdue = item.is_active && item.next_due_date < todayIso;
  const dueToday = item.is_active && item.next_due_date === todayIso;

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", !item.is_active && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {overdue && <Badge variant="destructive">Overdue</Badge>}
          {dueToday && <Badge>Due today</Badge>}
          {!item.is_active && <Badge variant="secondary">Paused</Badge>}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {[describeFrequency(item.frequency, item.interval_count), item.is_active && `next ${formatDay(item.next_due_date)}`, account?.name]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span className={cn("shrink-0 font-medium tabular-nums", amount > 0 && "text-primary")}>
        {formatMoney(amount, account?.currency, { signed: true })}
      </span>
      {item.is_active && (
        <Button variant="outline" size="sm" onClick={() => setPaying(true)} className="max-sm:hidden">
          <Check /> {amount > 0 ? "Received" : "Paid"}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Options for ${item.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.is_active && (
            <>
              <DropdownMenuItem onSelect={() => setPaying(true)}>
                <Check /> {amount > 0 ? "Mark received" : "Mark paid"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startTransition(async () => void (await skipOccurrence(item.id)))}>
                <SkipForward /> Skip this one
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => startTransition(() => setRecurringActive(item.id, !item.is_active))}>
            {item.is_active ? <Pause /> : <Play />} {item.is_active ? "Pause" : "Resume"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {paying && <MarkPaidDialog item={item} currency={account?.currency ?? "IDR"} open onOpenChange={setPaying} />}
      <RecurringFormDialog item={item} accounts={accounts} groups={groups} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${item.name}?`}
        description="Past transactions recorded from it stay."
        onConfirm={() => deleteRecurring(item.id)}
      />
    </li>
  );
}
