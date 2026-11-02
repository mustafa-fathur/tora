// CSV import helpers: parsing, column guessing, dates and amounts in bank formats.

// Parses CSV text with quoted fields. Detects the delimiter (comma, semicolon or tab).
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export type DateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
export const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY"];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8,
  sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

// Returns YYYY-MM-DD or null. Separators can be / - or . ; "12 Nov 2026" also works.
// Two-digit years are 20xx.
export function parseDate(input: string, format: DateFormat): string | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  const named = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3})[A-Za-z]*[\s-]+(\d{2,4})/);
  if (named) {
    d = Number(named[1]);
    m = MONTHS[named[2].toLowerCase()] ?? 0;
    y = Number(named[3]);
  } else {
    const parts = s.split(/[\s/.\-T]/).filter(Boolean).slice(0, 3).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    if (format === "YYYY-MM-DD") [y, m, d] = parts;
    else if (format === "DD/MM/YYYY") [d, m, y] = parts;
    else [m, d, y] = parts;
  }
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Picks the date format that parses the most sample values.
export function guessDateFormat(samples: string[]): DateFormat {
  let best: DateFormat = "DD/MM/YYYY";
  let bestScore = -1;
  for (const f of DATE_FORMATS) {
    const score = samples.filter((s) => parseDate(s, f)).length;
    if (score > bestScore) [best, bestScore] = [f, score];
  }
  return best;
}

// Parses a signed amount in either number style: "1.250.000,50", "1,250,000.50",
// "-45.000", "(45,000)", "45.000 DB" / "45.000 CR" (debit is negative).
export function parseSignedAmount(input: string): number | null {
  let s = input.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\b(DB|D|DR|DEBIT)\.?$/i.test(s)) negative = true;
  s = s.replace(/\b(DB|D|DR|CR|K|KR|DEBIT|CREDIT)\.?$/i, "");
  if (s.includes("-")) negative = true;
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep: string | null = null;
  if (lastDot >= 0 && lastComma >= 0) decimalSep = lastDot > lastComma ? "." : ",";
  else {
    const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : null;
    // A single separator followed by exactly 3 digits is a thousands separator.
    if (sep && s.split(sep).length === 2 && s.length - s.lastIndexOf(sep) - 1 !== 3) decimalSep = sep;
  }
  const normalized = decimalSep
    ? s.replace(new RegExp(`\\${decimalSep === "." ? "," : "."}`, "g"), "").replace(decimalSep, ".")
    : s.replace(/[.,]/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round((negative ? -value : value) * 100) / 100;
}

export type ColumnMap = {
  date: number;
  description: number;
  amount?: number; // one signed column
  debit?: number; // or separate money-out / money-in columns
  credit?: number;
};

// Guesses columns from header names (English and Indonesian bank exports).
export function guessColumns(header: string[]): Partial<ColumnMap> {
  const find = (re: RegExp) => {
    const i = header.findIndex((h) => re.test(h.toLowerCase()));
    return i >= 0 ? i : undefined;
  };
  return {
    date: find(/^(date|tanggal|tgl|transaction date|tanggal transaksi)/),
    description: find(/(description|keterangan|deskripsi|details|uraian|memo|payee|merchant)/),
    amount: find(/^(amount|jumlah|nominal|mutasi)$/),
    debit: find(/^(debit|debet|withdrawal|out|keluar|uang keluar)/),
    credit: find(/^(credit|kredit|deposit|in|masuk|uang masuk)/),
  };
}

export type ParsedRow = { line: number; date: string | null; description: string; amount: number | null };

export function mapRows(rows: string[][], map: ColumnMap, format: DateFormat): ParsedRow[] {
  return rows.map((r, i) => {
    let amount: number | null;
    if (map.amount !== undefined) amount = parseSignedAmount(r[map.amount] ?? "");
    else {
      const out = parseSignedAmount(r[map.debit ?? -1] ?? "");
      const inn = parseSignedAmount(r[map.credit ?? -1] ?? "");
      amount = out ? -Math.abs(out) : inn ? Math.abs(inn) : null;
    }
    return {
      line: i + 2, // 1-based, after the header
      date: parseDate(r[map.date] ?? "", format),
      description: (r[map.description] ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      amount: amount === 0 ? null : amount,
    };
  });
}

// Key for spotting duplicates of transactions already in Tora.
export const duplicateKey = (date: string, amount: number, description: string | null) =>
  `${date}|${amount.toFixed(2)}|${(description ?? "").toLowerCase().replace(/\s+/g, " ").trim()}`;
