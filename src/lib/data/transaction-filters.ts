import type { TransactionFilters } from "@/lib/data/queries";
import { isMonth, monthRange } from "@/lib/finance/dates";
import { isUuid } from "@/lib/finance/form";
import type { Category } from "@/lib/finance/types";

export const UNCATEGORIZED = "uncategorized";

type Params = Record<string, string | string[] | undefined>;
const param = (sp: Params, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

// Reads ?month=&account=&category=&q=&import= (shared by the Transactions page and CSV export).
export function parseTransactionParams(sp: Params, categories: Category[], todayIso: string) {
  const month = isMonth(param(sp, "month") ?? "") ? param(sp, "month")! : todayIso.slice(0, 7);
  const account = isUuid(param(sp, "account") ?? "") ? param(sp, "account") : undefined;
  const rawCategory = param(sp, "category");
  const uncategorized = rawCategory === UNCATEGORIZED;
  const category = uncategorized || isUuid(rawCategory ?? "") ? rawCategory : undefined;
  const importId = isUuid(param(sp, "import") ?? "") ? param(sp, "import") : undefined;
  const q = param(sp, "q")?.slice(0, 100) || undefined;
  const all = param(sp, "all") === "1";

  // A group includes its categories.
  const categoryIds =
    category && !uncategorized ? [category, ...categories.filter((c) => c.parent_id === category).map((c) => c.id)] : undefined;
  // Reviewing an import (or exporting everything) ignores the month.
  const { start, end } = importId || all ? { start: "1900-01-01", end: "9999-12-31" } : monthRange(month);

  const filters: TransactionFilters = { start, end, accountId: account, categoryIds, uncategorized, q, importId };
  return { month, account, category, q, importId, all, filters };
}

// Same filters as a query string, e.g. for the export link.
export function filtersQuery(v: { month: string; account?: string; category?: string; q?: string; importId?: string }) {
  const p = new URLSearchParams();
  if (v.importId) p.set("import", v.importId);
  else p.set("month", v.month);
  if (v.account) p.set("account", v.account);
  if (v.category) p.set("category", v.category);
  if (v.q) p.set("q", v.q);
  return p.toString();
}
