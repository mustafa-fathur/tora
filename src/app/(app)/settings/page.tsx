import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountTypeManager } from "@/components/settings/account-type-manager";
import { CategoryManager } from "@/components/settings/category-manager";
import { RatesForm } from "@/components/settings/rates-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAccounts, getAccountTypes, getCategories, getCurrencies, getRates, toCategoryGroups } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Settings · Tora" };

export default function SettingsPage() {
  return (
    <Tabs defaultValue="categories" className="gap-6">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="account-types">Account types</TabsTrigger>
        <TabsTrigger value="rates">Exchange rates</TabsTrigger>
      </TabsList>
      <TabsContent value="categories" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Groups and the categories inside them. Transactions and budgets use these.
        </p>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <Categories />
        </Suspense>
      </TabsContent>
      <TabsContent value="account-types" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          The types you can pick when adding an account. The kind decides where it appears and
          whether it counts as money you own or money you owe.
        </p>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <AccountTypes />
        </Suspense>
      </TabsContent>
      <TabsContent value="rates" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Used to count foreign-currency accounts in your IDR totals (net worth, cash flow, budgets).
        </p>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <Rates />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

async function Categories() {
  return <CategoryManager groups={toCategoryGroups(await getCategories())} />;
}

async function AccountTypes() {
  const [types, accounts] = await Promise.all([getAccountTypes(), getAccounts()]);
  const usage: Record<string, number> = {};
  for (const a of accounts) usage[a.type_id] = (usage[a.type_id] ?? 0) + 1;
  return <AccountTypeManager types={types} usage={usage} />;
}

async function Rates() {
  const [currencies, rates, accounts] = await Promise.all([getCurrencies(), getRates(), getAccounts()]);
  const used = [...new Set(accounts.map((a) => a.currency))];
  return (
    <RatesForm
      currencies={currencies}
      rates={rates.map((r) => ({ currency: r.currency, rate: Number(r.rate), source: r.source, updated_at: r.updated_at }))}
      used={used}
    />
  );
}
