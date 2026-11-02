import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { GoalCard, GoalFormDialog, type GoalView } from "@/components/goals/goal-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccounts, getGoals } from "@/lib/data/queries";
import { today } from "@/lib/finance/dates";
import { monthsUntil } from "@/lib/finance/recurring";

export const metadata: Metadata = { title: "Goals · Tora" };

export default function GoalsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <GoalsView />
    </Suspense>
  );
}

async function GoalsView() {
  await connection();
  const [accounts, goals] = await Promise.all([getAccounts(), getGoals()]);
  const todayIso = today();
  const views: GoalView[] = goals.map((g) => {
    const account = accounts.find((a) => a.id === g.account_id);
    const saved = account ? Math.max(0, account.balance) : Number(g.saved_amount);
    const left = Number(g.target_amount) - saved;
    const months = g.target_date ? monthsUntil(todayIso, g.target_date) : null;
    return { ...g, saved, perMonth: left > 0 && months ? Math.ceil(left / months) : null };
  });
  const active = views.filter((g) => !g.is_archived);
  const archived = views.filter((g) => g.is_archived);

  const addButton = (
    <GoalFormDialog
      accounts={accounts}
      trigger={
        <Button>
          <Plus /> New goal
        </Button>
      }
    />
  );

  if (goals.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center">
        <p className="text-lg font-medium">Save for something</p>
        <p className="max-w-sm text-muted-foreground">
          Set a target and a date. Tora shows your progress and how much to put aside each month.
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">{addButton}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {active.map((g) => (
          <GoalCard key={g.id} goal={g} accounts={accounts} />
        ))}
      </div>
      {archived.length > 0 && (
        <details className="rounded-xl border px-4 py-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Archived goals ({archived.length})</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} accounts={accounts} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
