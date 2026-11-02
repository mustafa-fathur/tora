import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryManager } from "@/components/settings/category-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, toCategoryGroups } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Settings · Tora" };

export default function SettingsPage() {
  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Groups and the categories inside them. Transactions and budgets use these.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  return <CategoryManager groups={toCategoryGroups(await getCategories())} />;
}
