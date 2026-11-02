"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { fetchRates, saveRates } from "@/app/(app)/settings/actions";
import { FormError, useSaveAction } from "@/components/app/form-bits";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Currency } from "@/lib/finance/types";

type Rate = { currency: string; rate: number; source: string; updated_at: string };

export function RatesForm({ currencies, rates, used }: { currencies: Currency[]; rates: Rate[]; used: string[] }) {
  const [state, action, pending] = useSaveAction(saveRates, () => {});
  const [fetching, startFetch] = useTransition();
  const [fetchMsg, setFetchMsg] = useState<{ ok: boolean; text: string }>();
  const byCode = new Map(rates.map((r) => [r.currency, r]));
  const foreign = currencies.filter((c) => c.code !== "IDR");
  // Currencies used by accounts first.
  const ordered = [...foreign].sort((a, b) => Number(used.includes(b.code)) - Number(used.includes(a.code)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={fetching}
          onClick={() =>
            startFetch(async () => {
              const r = await fetchRates(foreign.map((c) => c.code));
              setFetchMsg({ ok: r.status === "success", text: r.message ?? "" });
            })
          }
        >
          <RefreshCw className={fetching ? "animate-spin" : undefined} /> {fetching ? "Fetching…" : "Fetch today's rates"}
        </Button>
        <span className="text-xs text-muted-foreground">
          From open.er-api.com (free, updated daily). You can also type rates yourself.
        </span>
      </div>
      {fetchMsg && <FormAlert variant={fetchMsg.ok ? "success" : "error"}>{fetchMsg.text}</FormAlert>}
      <form action={action} className="flex flex-col gap-4">
        <FormError state={state} />
        {state.status === "success" && <FormAlert variant="success">Rates saved.</FormAlert>}
        <div className="divide-y rounded-xl border bg-card">
          {ordered.map((c) => {
            const r = byCode.get(c.code);
            return (
              <label key={c.code} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-44">
                  <span className="font-medium">1 {c.code}</span>{" "}
                  <span className="text-muted-foreground">{c.name}</span>
                  {used.includes(c.code) && <span className="block text-xs text-primary">Used by your accounts</span>}
                </span>
                <span className="text-muted-foreground">=</span>
                <Input
                  name={`rate_${c.code}`}
                  defaultValue={r ? String(r.rate).replace(".", ",") : ""}
                  key={r?.updated_at}
                  inputMode="decimal"
                  placeholder="not set"
                  className="w-40 tabular-nums"
                  aria-label={`IDR per ${c.code}`}
                />
                <span className="text-muted-foreground">IDR</span>
                {r && (
                  <span className="text-xs text-muted-foreground">
                    {r.source === "api" ? "fetched" : "manual"} {new Date(r.updated_at).toLocaleDateString("en-GB")}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <div>
          <SubmitButton pending={pending} pendingText="Saving…">
            Save rates
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
