import { execSync } from "node:child_process";

// Reads the LOCAL Supabase stack's URL and keys (`supabase start`). These are the
// public development defaults of the local stack, never the hosted project.
export function localSupabase() {
  let out: string;
  try {
    out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("Local Supabase isn't running. Start it with: npx supabase start");
  }
  const env = Object.fromEntries(
    out
      .split("\n")
      .map((l) => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => [m[1], m[2]]),
  );
  const url = env.API_URL;
  if (!url?.startsWith("http://127.0.0.1")) throw new Error("Refusing to run E2E tests against a non-local Supabase.");
  return {
    url,
    publishableKey: env.PUBLISHABLE_KEY || env.ANON_KEY,
    serviceKey: env.SECRET_KEY || env.SERVICE_ROLE_KEY,
  };
}

export const TEST_USER = { email: "e2e@tora.test", password: "e2e-password-123" };
