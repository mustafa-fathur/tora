import {
  ArrowLeftRight,
  CalendarDays,
  ChartColumn,
  ChartPie,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

// Tora's own grouping: what's happening, where money lives, plans, and insights.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Accounts", href: "/accounts", icon: Wallet },
      { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Planning",
    items: [
      { title: "Budgets", href: "/budgets", icon: PiggyBank },
      { title: "Recurring", href: "/recurring", icon: Repeat },
      { title: "Goals", href: "/goals", icon: Target },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Cash flow", href: "/cash-flow", icon: ChartColumn },
      { title: "Reports", href: "/reports", icon: ChartPie },
    ],
  },
];

export const SECONDARY_NAV: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

export function navTitle(pathname: string) {
  const item = [...NAV_GROUPS.flatMap((g) => g.items), ...SECONDARY_NAV].find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return item?.title ?? "Tora";
}
