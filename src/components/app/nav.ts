import {
  ArrowLeftRight,
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

export const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", href: "/accounts", icon: Wallet },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Cash flow", href: "/cash-flow", icon: ChartColumn },
  { title: "Budgets", href: "/budgets", icon: PiggyBank },
  { title: "Recurring", href: "/recurring", icon: Repeat },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Reports", href: "/reports", icon: ChartPie },
];

export const SECONDARY_NAV: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

export function navTitle(pathname: string) {
  const item = [...MAIN_NAV, ...SECONDARY_NAV].find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return item?.title ?? "Tora";
}
