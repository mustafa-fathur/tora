import { describe, expect, it } from "vitest";

import { makeContext, type TxLike } from "@/lib/finance/cashflow";
import { calendarRange, calendarTitle, dailyTotals, monthGrid, weekDays, weekStart } from "@/lib/finance/calendar";

describe("calendar grid", () => {
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-11-03")).toBe("2026-11-02"); // Tue → Mon
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sun → Mon
    expect(weekDays("2026-11-08")).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });

  it("covers the whole month in full weeks", () => {
    const grid = monthGrid("2026-11-15"); // Nov 2026: starts Sunday, 30 days
    expect(grid[0][0]).toBe("2026-10-26");
    expect(grid.at(-1)![6]).toBe("2026-12-06");
    expect(grid).toHaveLength(6);
    expect(grid.flat()).toContain("2026-11-30");
    expect(monthGrid("2027-02-01")).toHaveLength(4); // Feb 2027 starts Monday, 28 days
  });

  it("navigates per view", () => {
    expect(calendarRange("day", "2026-11-03")).toMatchObject({ start: "2026-11-03", end: "2026-11-04", prev: "2026-11-02" });
    expect(calendarRange("week", "2026-11-05")).toMatchObject({ start: "2026-11-02", end: "2026-11-09", next: "2026-11-09" });
    expect(calendarRange("month", "2026-01-20")).toMatchObject({ prev: "2025-12-01", next: "2026-02-01", start: "2025-12-29" });
  });

  it("titles each view", () => {
    expect(calendarTitle("month", "2026-11-03")).toBe("November 2026");
    expect(calendarTitle("week", "2026-11-03")).toBe("2 Nov – 8 Nov 2026");
    expect(calendarTitle("day", "2026-11-03")).toBe("Tuesday, 3 November 2026");
  });
});

describe("dailyTotals", () => {
  const ctx = makeContext([{ id: "a", currency: "IDR" }], [], {});
  const tx = (p: Partial<TxLike>): TxLike => ({ account_id: "a", amount: -1, date: "2026-11-03", kind: "regular", category_id: null, ...p });

  it("sums income and spending per day and counts every row", () => {
    const res = dailyTotals(
      [tx({ amount: -19000 }), tx({ amount: -6000 }), tx({ amount: 100000 }), tx({ amount: -50000, kind: "transfer" }), tx({ date: "2026-11-04", amount: -1000 })],
      ctx,
    );
    expect(res["2026-11-03"]).toEqual({ income: 100000, spending: 25000, count: 4 });
    expect(res["2026-11-04"]).toEqual({ income: 0, spending: 1000, count: 1 });
  });
});
