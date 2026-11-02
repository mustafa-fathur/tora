import { describe, expect, it } from "vitest";

import { duplicateKey, guessColumns, guessDateFormat, mapRows, parseCsv, parseDate, parseSignedAmount } from "@/lib/finance/csv";

describe("parseCsv", () => {
  it("handles quotes, embedded delimiters and CRLF", () => {
    expect(parseCsv('Date,Description,Amount\r\n01/11/2026,"Kopi, susu",-25000\r\n"02/11/2026","He said ""hi""",100\r\n')).toEqual([
      ["Date", "Description", "Amount"],
      ["01/11/2026", "Kopi, susu", "-25000"],
      ["02/11/2026", 'He said "hi"', "100"],
    ]);
  });

  it("detects semicolons", () => {
    expect(parseCsv("Tanggal;Keterangan;Jumlah\n01/11/2026;Gaji;5.000.000,00")[1]).toEqual(["01/11/2026", "Gaji", "5.000.000,00"]);
  });
});

describe("parseDate", () => {
  it.each([
    ["01/11/2026", "DD/MM/YYYY", "2026-11-01"],
    ["2026-11-01", "YYYY-MM-DD", "2026-11-01"],
    ["11/01/2026", "MM/DD/YYYY", "2026-11-01"],
    ["01-11-26", "DD/MM/YYYY", "2026-11-01"],
    ["5 Nov 2026", "DD/MM/YYYY", "2026-11-05"],
    ["05 Agu 2026", "DD/MM/YYYY", "2026-08-05"],
  ] as const)("%s (%s)", (input, format, expected) => {
    expect(parseDate(input, format)).toBe(expected);
  });

  it("rejects impossible dates", () => {
    expect(parseDate("31/02/2026", "DD/MM/YYYY")).toBeNull();
    expect(parseDate("hello", "DD/MM/YYYY")).toBeNull();
  });

  it("guesses the format from samples", () => {
    expect(guessDateFormat(["25/10/2026", "01/11/2026"])).toBe("DD/MM/YYYY");
    expect(guessDateFormat(["2026-10-25"])).toBe("YYYY-MM-DD");
  });
});

describe("parseSignedAmount", () => {
  it.each([
    ["1.250.000,50", 1250000.5],
    ["1,250,000.50", 1250000.5],
    ["-45.000", -45000],
    ["45,000", 45000],
    ["(45,000)", -45000],
    ["45.000 DB", -45000],
    ["45.000,00 CR", 45000],
    ["Rp 12.500", 12500],
    ["10.5", 10.5],
  ])("%s → %d", (input, expected) => {
    expect(parseSignedAmount(input)).toBe(expected);
  });

  it("returns null for empty", () => {
    expect(parseSignedAmount("")).toBeNull();
  });
});

describe("mapping", () => {
  it("guesses Indonesian headers and maps debit/credit columns", () => {
    const header = ["Tanggal", "Keterangan", "Debet", "Kredit"];
    const cols = guessColumns(header);
    expect(cols).toMatchObject({ date: 0, description: 1, debit: 2, credit: 3 });
    const rows = mapRows(
      [
        ["01/11/2026", "Indomaret", "45.000", ""],
        ["02/11/2026", "Gaji", "", "5.000.000"],
        ["bad", "x", "", ""],
      ],
      { date: 0, description: 1, debit: 2, credit: 3 },
      "DD/MM/YYYY",
    );
    expect(rows).toEqual([
      { line: 2, date: "2026-11-01", description: "Indomaret", amount: -45000 },
      { line: 3, date: "2026-11-02", description: "Gaji", amount: 5000000 },
      { line: 4, date: null, description: "x", amount: null },
    ]);
  });

  it("builds duplicate keys that ignore case and spacing", () => {
    expect(duplicateKey("2026-11-01", -45000, "  Indomaret  Point ")).toBe(duplicateKey("2026-11-01", -45000, "indomaret point"));
  });
});
