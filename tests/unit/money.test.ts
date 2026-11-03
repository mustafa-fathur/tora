import { describe, expect, it } from "vitest";

import { formatMoney, parseAmount } from "@/lib/money";

// Intl uses non-breaking spaces in some locales; normalize for readable assertions.
const fmt = (...args: Parameters<typeof formatMoney>) => formatMoney(...args).replace(/\s/g, " ");

describe("parseAmount", () => {
  it.each([
    ["1.250.000", "IDR", 1250000],
    ["1250000", "IDR", 1250000],
    ["Rp 45.000", "IDR", 45000],
    ["10,50", "USD", 10.5],
    ["10.50", "USD", 10.5],
    ["1.250,75", "USD", 1250.75],
    ["1.250", "USD", 1250],
  ])("reads %s (%s) as %d", (input, currency, expected) => {
    expect(parseAmount(input, currency)).toBe(expected);
  });

  it.each(["", "0", "abc", "0,00", "99999999999999999"])("rejects %j", (input) => {
    expect(parseAmount(input, "IDR")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("shows IDR without decimals, Indonesian style", () => {
    expect(fmt(1250000)).toBe("Rp 1.250.000");
    expect(fmt("1250000.00")).toBe("Rp 1.250.000");
  });

  it("shows signs when asked", () => {
    expect(fmt(-350000, "IDR", { signed: true })).toBe("-Rp 350.000");
    expect(fmt(50000, "IDR", { signed: true })).toBe("+Rp 50.000");
  });

  it("keeps decimals for other currencies", () => {
    expect(fmt(10.5, "USD")).toBe("US$10,50");
    expect(fmt(1500, "JPY")).toBe("JP¥1.500");
  });
});

describe("formatCompact", async () => {
  const { formatCompact } = await import("@/lib/money");
  it("shortens IDR amounts the Indonesian way", () => {
    expect(formatCompact(45000)).toBe("45 rb");
    expect(formatCompact(-1250000)).toBe("1,3 jt");
    expect(formatCompact(950)).toBe("950");
  });
});
