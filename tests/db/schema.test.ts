import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import { applyMigrations, as, createDb, migrationFiles, OTHER, OWNER } from "./db";

type Row = Record<string, unknown>;
let db: PGlite;
const q = async <T = Row>(sql: string, params?: unknown[]) => (await db.query<T>(sql, params)).rows;
const one = async <T = Row>(sql: string, params?: unknown[]) => (await q<T>(sql, params))[0];
const count = async (sql: string, params?: unknown[]) =>
  Number((await one<{ n: number }>(`select count(*)::int as n from (${sql}) s`, params)).n);

describe("migrations upgrade existing data", () => {
  it("moves accounts from the old enum to account types", async () => {
    const files = migrationFiles();
    const typesMigration = files.findIndex((f) => f.includes("account_types"));
    db = await createDb();
    await db.query("insert into auth.users values ($1, 'owner@test')", [OWNER]);
    await applyMigrations(db, files.slice(0, typesMigration));
    await as(db, OWNER, () =>
      q(`insert into accounts (name, type, opening_balance) values
           ('BCA', 'bank', 100), ('Visa', 'credit_card', -50)`),
    );

    await applyMigrations(db, files.slice(typesMigration));

    const rows = await q<{ name: string; type: string; class: string }>(
      `select a.name, t.name as type, t.class from accounts a
       join account_types t on t.id = a.type_id order by a.name`,
    );
    expect(rows).toEqual([
      { name: "BCA", type: "Bank account", class: "cash" },
      { name: "Visa", type: "Credit card", class: "liability" },
    ]);
  });
});

describe("schema (fresh database)", () => {
  let bank: string;
  let card: string;
  let groceries: string;

  beforeAll(async () => {
    db = await createDb();
    await db.query("insert into auth.users values ($1, 'owner@test')", [OWNER]);
    await applyMigrations(db);
    await db.query("insert into auth.users values ($1, 'other@test')", [OTHER]); // via trigger

    await as(db, OWNER, async () => {
      const typeId = async (name: string) =>
        (await one<{ id: string }>("select id from account_types where name = $1", [name])).id;
      bank = (
        await one<{ id: string }>(
          "insert into accounts (name, type_id, opening_balance) values ('BCA', $1, 10000000) returning id",
          [await typeId("Bank account")],
        )
      ).id;
      card = (
        await one<{ id: string }>(
          "insert into accounts (name, type_id, opening_balance) values ('Visa', $1, -500000) returning id",
          [await typeId("Credit card")],
        )
      ).id;
      groceries = (await one<{ id: string }>("select id from categories where name = 'Groceries'")).id;
      await q(
        `insert into transactions (account_id, amount, date, time, category_id) values
           ($1, -250000, '2026-11-01', '08:15', $2),
           ($1, 50000, '2026-11-02', null, $2)`,
        [bank, groceries],
      );
      await q(
        `insert into transactions (account_id, kind, amount, date, transfer_id) values
           ($1, 'transfer', -300000, '2026-11-02', $3), ($2, 'transfer', 300000, '2026-11-02', $3)`,
        [bank, card, crypto.randomUUID()],
      );
    });
  });

  it("sets up new users with a profile, categories and account types", async () => {
    for (const user of [OWNER, OTHER]) {
      expect(await count("select 1 from profiles where id = $1", [user])).toBe(1);
      expect(await count("select 1 from categories where user_id = $1", [user])).toBe(51);
      expect(await count("select 1 from account_types where user_id = $1", [user])).toBe(10);
    }
  });

  it("computes balances from opening balance plus transactions", async () => {
    const balances = await as(db, OWNER, () =>
      q<{ account_id: string; balance: string }>("select account_id, balance::text from account_balances"),
    );
    const byId = Object.fromEntries(balances.map((b) => [b.account_id, b.balance]));
    expect(byId[bank]).toBe("9500000.00"); // 10M - 250k + 50k refund - 300k transfer
    expect(byId[card]).toBe("-200000.00"); // -500k + 300k payment
  });

  it("hides one user's data from another", async () => {
    await as(db, OTHER, async () => {
      for (const table of ["accounts", "transactions", "account_balances", "budgets", "goals"]) {
        expect(await count(`select 1 from ${table}`)).toBe(0);
      }
      // Only their own categories and types.
      expect(await count("select 1 from categories where user_id <> $1", [OTHER])).toBe(0);
      expect(await count("select 1 from account_types where user_id <> $1", [OTHER])).toBe(0);
    });
  });

  it("blocks writing into another user's data", async () => {
    await as(db, OTHER, async () => {
      await expect(
        q("insert into transactions (account_id, amount, date) values ($1, -1, '2026-11-02')", [bank]),
      ).rejects.toThrow();
      await expect(
        q("insert into accounts (user_id, name, type_id) values ($1, 'x', gen_random_uuid())", [OWNER]),
      ).rejects.toThrow(/row-level security/);
      const updated = await db.query("update accounts set name = 'hacked' where id = $1", [bank]);
      expect(updated.affectedRows ?? 0).toBe(0);
    });
  });

  it("gives anon nothing but the heartbeat", async () => {
    await as(db, null, async () => {
      await expect(q("select 1 from accounts")).rejects.toThrow(/permission denied/);
      await expect(q("select 1 from currencies")).rejects.toThrow(/permission denied/);
      expect(await count("select 1 from heartbeat")).toBe(1);
    });
  });

  it("doesn't expose the setup functions to users", async () => {
    await as(db, OTHER, async () => {
      await expect(q("select public.seed_default_categories($1)", [OTHER])).rejects.toThrow(/permission denied/);
      await expect(q("select public.seed_default_account_types($1)", [OTHER])).rejects.toThrow(/permission denied/);
    });
  });

  it("rejects invalid data", async () => {
    await as(db, OWNER, async () => {
      await expect(q("insert into transactions (account_id, amount, date) values ($1, 0, '2026-11-02')", [bank])).rejects.toThrow(/check/);
      await expect(
        q("insert into transactions (account_id, kind, amount, date, category_id, transfer_id) values ($1, 'transfer', -1, '2026-11-02', $2, gen_random_uuid())", [bank, groceries]),
      ).rejects.toThrow(/check/);
      await expect(q("insert into budgets (category_id, month, amount) values ($1, '2026-11-15', 1)", [groceries])).rejects.toThrow(/check/);
    });
  });

  it("won't delete an account type that's in use", async () => {
    await as(db, OWNER, async () => {
      await expect(q("delete from account_types where name = 'Bank account'")).rejects.toThrow(/foreign key/);
      const deleted = await db.query("delete from account_types where name = 'Paylater'");
      expect(deleted.affectedRows).toBe(1);
    });
  });

  it("keeps exchange rates private and valid", async () => {
    await as(db, OWNER, () => q("insert into exchange_rates (currency, rate) values ('USD', 16000)"));
    await as(db, OTHER, async () => {
      expect(await count("select 1 from exchange_rates")).toBe(0);
      await q("insert into exchange_rates (currency, rate) values ('USD', 1)"); // their own row is fine
    });
    await as(db, OWNER, async () => {
      expect((await one<{ rate: string }>("select rate::text from exchange_rates")).rate).toBe("16000.00000000");
      await expect(q("insert into exchange_rates (currency, rate) values ('IDR', 1)")).rejects.toThrow(/check/);
      await expect(q("insert into exchange_rates (currency, rate) values ('EUR', 0)")).rejects.toThrow(/check/);
    });
  });

  it("groups imported rows by import_id", async () => {
    const importId = crypto.randomUUID();
    await as(db, OWNER, async () => {
      await q("insert into transactions (account_id, amount, date, import_id) values ($1, -1, '2026-11-03', $2), ($1, -2, '2026-11-03', $2)", [bank, importId]);
      expect(await count("select 1 from transactions where import_id = $1", [importId])).toBe(2);
      await q("delete from transactions where import_id = $1", [importId]);
    });
  });

  it("keeps transactions when their category is deleted", async () => {
    await as(db, OWNER, async () => {
      await q("delete from categories where id = $1", [groceries]);
      expect(await count("select 1 from transactions where category_id is null and kind = 'regular'")).toBe(2);
    });
  });
});
