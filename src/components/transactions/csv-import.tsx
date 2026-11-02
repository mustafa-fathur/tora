"use client";

import { FileUp, Undo2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { existingForDuplicates, importTransactions, type ImportResult, undoImport } from "@/app/(app)/transactions/import/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type ColumnMap,
  DATE_FORMATS,
  type DateFormat,
  duplicateKey,
  guessColumns,
  guessDateFormat,
  mapRows,
  parseCsv,
} from "@/lib/finance/csv";
import type { Account } from "@/lib/finance/types";
import { formatMoney } from "@/lib/money";

type Step = "upload" | "map" | "preview" | "done";
const NONE = "-1";

export function CsvImport({ accounts }: { accounts: Account[] }) {
  const usable = accounts.filter((a) => !a.is_archived);
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState(usable[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [map, setMap] = useState<Partial<ColumnMap>>({});
  const [twoColumns, setTwoColumns] = useState(false);
  const [format, setFormat] = useState<DateFormat>("DD/MM/YYYY");
  const [flip, setFlip] = useState(false);
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();
  const [pending, startTransition] = useTransition();

  const account = usable.find((a) => a.id === accountId);
  const header = hasHeader ? table[0] ?? [] : (table[0] ?? []).map((_, i) => `Column ${i + 1}`);
  const body = hasHeader ? table.slice(1) : table;

  const rows = useMemo(() => {
    if (map.date === undefined || map.description === undefined) return [];
    if (twoColumns ? map.debit === undefined && map.credit === undefined : map.amount === undefined) return [];
    return mapRows(body, { ...map, amount: twoColumns ? undefined : map.amount } as ColumnMap, format).map((r) => ({
      ...r,
      amount: r.amount === null ? null : flip ? -r.amount : r.amount,
    }));
  }, [body, map, twoColumns, format, flip]);

  const valid = rows.filter((r) => r.date && r.amount !== null);
  const isDuplicate = (r: (typeof rows)[number]) => duplicates.has(duplicateKey(r.date!, r.amount!, r.description));
  const toImport = valid.filter((r) => !(skipDuplicates && isDuplicate(r)));

  async function onFile(file: File) {
    setError(undefined);
    if (file.size > 5 * 1024 * 1024) return setError("That file is over 5 MB. Split it into smaller files.");
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return setError("That file doesn't look like a CSV with transactions.");
    setFileName(file.name);
    setTable(parsed);
    const guessed = guessColumns(parsed[0]);
    const useTwo = guessed.amount === undefined && (guessed.debit !== undefined || guessed.credit !== undefined);
    setTwoColumns(useTwo);
    setMap(guessed);
    if (guessed.date !== undefined) setFormat(guessDateFormat(parsed.slice(1, 30).map((r) => r[guessed.date!] ?? "")));
    setStep("map");
  }

  function toPreview() {
    setError(undefined);
    const dates = valid.map((r) => r.date!).sort();
    if (!dates.length) return setError("No rows could be read. Check the columns and date format.");
    startTransition(async () => {
      const existing = await existingForDuplicates(accountId, dates[0], dates.at(-1)!);
      setDuplicates(new Set(existing.map((e) => duplicateKey(e.date, e.amount, e.description))));
      setStep("preview");
    });
  }

  function runImport() {
    setError(undefined);
    startTransition(async () => {
      const r = await importTransactions(
        accountId,
        toImport.map((x) => ({ date: x.date!, description: x.description, amount: x.amount! })),
      );
      if (r.status === "error") setError(r.message);
      else {
        setResult(r);
        setStep("done");
      }
    });
  }

  if (!usable.length) {
    return <p className="text-muted-foreground">Add an account first, then import its statement.</p>;
  }

  const column = (key: keyof ColumnMap, label: string, optional = false) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={map[key] === undefined ? NONE : String(map[key])}
        onValueChange={(v) => setMap((m) => ({ ...m, [key]: v === NONE ? undefined : Number(v) }))}
      >
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>Not in this file</SelectItem>}
          {!optional && map[key] === undefined && <SelectItem value={NONE}>Choose a column…</SelectItem>}
          {header.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `Column ${i + 1}`} {body[0]?.[i] ? `(e.g. ${body[0][i].slice(0, 24)})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {step === "upload" && (
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="import-account">Import into</FieldLabel>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="import-account" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usable.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="csv-file">Bank statement (CSV)</FieldLabel>
            <label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-muted/50"
            >
              <FileUp className="size-6" />
              Choose a .csv file exported from your bank or e-wallet
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
            <FieldDescription>The file is read in your browser. Only the rows you confirm are saved.</FieldDescription>
          </Field>
        </FieldGroup>
      )}

      {step === "map" && (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{fileName}</strong>: {body.length} rows. Match the columns, then preview.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            The first row has column names
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {column("date", "Date")}
            <Field>
              <FieldLabel>Date format</FieldLabel>
              <Select value={format} onValueChange={(v) => setFormat(v as DateFormat)}>
                <SelectTrigger className="w-full" aria-label="Date format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {column("description", "Description")}
            <Field>
              <FieldLabel>Amounts are in</FieldLabel>
              <Select value={twoColumns ? "two" : "one"} onValueChange={(v) => setTwoColumns(v === "two")}>
                <SelectTrigger className="w-full" aria-label="Amount columns">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">One column (minus = money out)</SelectItem>
                  <SelectItem value="two">Two columns (money out / money in)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {twoColumns ? (
              <>
                {column("debit", "Money out (debit)", true)}
                {column("credit", "Money in (credit)", true)}
              </>
            ) : (
              column("amount", "Amount")
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={flip} onChange={(e) => setFlip(e.target.checked)} />
            Flip signs (some credit card exports show purchases as positive)
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
            <Button onClick={toPreview} disabled={pending || rows.length === 0}>
              {pending ? "Checking…" : `Preview ${valid.length} rows`}
            </Button>
          </div>
        </>
      )}

      {step === "preview" && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge>{toImport.length} to import</Badge>
            {valid.length - toImport.length > 0 && <Badge variant="secondary">{valid.length - toImport.length} duplicates skipped</Badge>}
            {rows.length - valid.length > 0 && <Badge variant="destructive">{rows.length - valid.length} unreadable</Badge>}
            <span className="text-muted-foreground">into {account?.name}</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            Skip rows that are already in Tora (same date, amount and description)
          </label>
          <div className="max-h-[50svh] overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 200).map((r) => {
                  const bad = !r.date || r.amount === null;
                  const dup = !bad && isDuplicate(r);
                  return (
                    <tr key={r.line} className={bad || (dup && skipDuplicates) ? "text-muted-foreground" : undefined}>
                      <td className="px-3 py-1.5 tabular-nums">{r.line}</td>
                      <td className="px-3 py-1.5 tabular-nums">{r.date ?? "?"}</td>
                      <td className="max-w-64 truncate px-3 py-1.5">{r.description}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {r.amount === null ? "?" : formatMoney(r.amount, account?.currency, { signed: true })}
                      </td>
                      <td className="px-3 py-1.5">{bad ? "Unreadable" : dup ? "Duplicate" : "New"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="text-xs text-muted-foreground">Showing the first 200 of {rows.length} rows.</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
            <Button onClick={runImport} disabled={pending || toImport.length === 0}>
              {pending ? "Importing…" : `Import ${toImport.length} transactions`}
            </Button>
          </div>
        </>
      )}

      {step === "done" && result?.importId && (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          <FormAlert variant="success">
            Imported {result.count} transactions into {account?.name}
            {result.categorized ? `; ${result.categorized} were categorized from your past transactions` : ""}.
          </FormAlert>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/transactions?import=${result.importId}`}>Review them</Link>
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await undoImport(result.importId!);
                  if (r.status === "error") setError(r.message);
                  else setStep("upload");
                })
              }
            >
              <Undo2 /> Undo this import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
