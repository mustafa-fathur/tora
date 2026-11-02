"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoney } from "@/lib/money";

const shortMonth = (m: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

// Compact axis labels: 1,2jt / 350rb.
const compact = (n: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const money = (value: unknown) => formatMoney(Number(value));

const cashflowConfig = {
  income: { label: "Income", color: "var(--chart-income)" },
  spending: { label: "Spending", color: "var(--chart-expense)" },
} satisfies ChartConfig;

export function CashflowChart({ data }: { data: { month: string; income: number; spending: number }[] }) {
  return (
    <ChartContainer config={cashflowConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(m) => shortMonth(String(m))} formatter={(v, name) => (
            <div className="flex w-full justify-between gap-4">
              <span className="text-muted-foreground">{cashflowConfig[name as keyof typeof cashflowConfig]?.label}</span>
              <span className="font-medium tabular-nums">{money(v)}</span>
            </div>
          )} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" fill="var(--color-spending)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const netWorthConfig = { netWorth: { label: "Net worth", color: "var(--chart-1)" } } satisfies ChartConfig;

export function NetWorthChart({ data, height = "h-64" }: { data: { month: string; netWorth: number }[]; height?: string }) {
  return (
    <ChartContainer config={netWorthConfig} className={`aspect-auto ${height} w-full`}>
      <AreaChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(m) => shortMonth(String(m))} formatter={(v) => <span className="font-medium tabular-nums">{money(v)}</span>} />}
        />
        <Area dataKey="netWorth" type="monotone" stroke="var(--color-netWorth)" fill="var(--color-netWorth)" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
