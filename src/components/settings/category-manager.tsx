"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteCategory } from "@/app/(app)/settings/actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CategoryFormDialog } from "@/components/settings/category-form-dialog";
import { Button } from "@/components/ui/button";
import type { Category, CategoryGroup, CategoryKind } from "@/lib/finance/types";

export function CategoryManager({ groups }: { groups: CategoryGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {(["expense", "income"] as CategoryKind[]).map((kind) => (
        <section key={kind} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{kind === "expense" ? "Spending" : "Income"}</h2>
            <CategoryFormDialog
              kind={kind}
              trigger={
                <Button variant="outline" size="sm">
                  <Plus /> New group
                </Button>
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {groups
              .filter((g) => g.kind === kind)
              .map((g) => (
                <div key={g.id} className="rounded-xl border bg-card">
                  <div className="flex items-center gap-2 border-b px-4 py-2.5">
                    <span aria-hidden className="text-lg">{g.icon ?? "•"}</span>
                    <span className="flex-1 font-medium">{g.name}</span>
                    <RowActions category={g} />
                  </div>
                  <ul className="divide-y">
                    {g.children.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 py-1.5 pr-4 pl-11 text-sm">
                        <span className="flex-1">{c.name}</span>
                        <RowActions category={c} />
                      </li>
                    ))}
                  </ul>
                  <div className="px-2 py-1.5">
                    <CategoryFormDialog
                      parent={g}
                      trigger={
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Plus /> Add category
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RowActions({ category }: { category: Category | CategoryGroup }) {
  const [deleting, setDeleting] = useState(false);
  const isGroup = !category.parent_id;
  return (
    <div className="flex">
      <CategoryFormDialog
        category={category}
        trigger={
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${category.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${category.name}`}
        onClick={() => setDeleting(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${category.name}?`}
        description={
          isGroup
            ? "This deletes the group and all its categories. Their transactions stay, but become uncategorized. Budgets for them are removed."
            : "Its transactions stay, but become uncategorized. Its budgets are removed."
        }
        onConfirm={() => deleteCategory(category.id)}
      />
    </div>
  );
}
