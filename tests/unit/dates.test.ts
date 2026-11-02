import { describe, expect, it } from "vitest";

import { isIsoDate, isMonth, monthRange, shiftMonth } from "@/lib/finance/dates";

describe("dates", () => {
  it("builds exclusive month ranges, including December", () => {
    expect(monthRange("2026-11")).toEqual({ start: "2026-11-01", end: "2026-12-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("validates input", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("02-11-2026")).toBe(false);
  });
});

describe("times", () => {
  it("accepts HH:MM and HH:MM:SS only", async () => {
    const { isTime, nowTime } = await import("@/lib/finance/dates");
    expect(isTime("08:15")).toBe(true);
    expect(isTime("23:59:59")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("8:15")).toBe(false);
    expect(isTime(nowTime())).toBe(true);
  });
});
