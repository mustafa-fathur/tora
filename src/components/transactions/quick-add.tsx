import { Plus } from "lucide-react";

import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { Button } from "@/components/ui/button";
import { getAccounts, getCategories, toCategoryGroups } from "@/lib/data/queries";

// "Add transaction" in the top bar, on every page. Render inside <Suspense>.
export async function QuickAddTransaction() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return (
    <TransactionFormDialog
      accounts={accounts}
      groups={toCategoryGroups(categories)}
      trigger={
        <Button size="sm">
          <Plus />
          <span className="max-sm:sr-only">Add transaction</span>
        </Button>
      }
    />
  );
}
