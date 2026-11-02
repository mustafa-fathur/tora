import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

// A throwaway in-memory Postgres with just enough of Supabase (auth schema,
// auth.uid(), anon/authenticated roles) to run our migrations and test RLS.

const MIGRATIONS = path.resolve(__dirname, "../../supabase/migrations");

export const migrationFiles = () => fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

export async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant execute on function auth.uid() to anon, authenticated;
    -- Supabase grants these by default on new objects in public.
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  return db;
}

export async function applyMigrations(db: PGlite, files = migrationFiles()) {
  for (const f of files) await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
}

// Runs fn as a signed-in user (or as anon when userId is null).
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>) {
  await db.exec(
    userId
      ? `set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`
      : `set role anon; select set_config('request.jwt.claim.sub', '', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

export const OWNER = "11111111-1111-1111-1111-111111111111";
export const OTHER = "22222222-2222-2222-2222-222222222222";
