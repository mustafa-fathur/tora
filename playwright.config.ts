import { defineConfig } from "@playwright/test";

import { localSupabase } from "./tests/e2e/local-supabase";

// End-to-end tests: a production build of the app against the LOCAL Supabase stack.
// Run: npx supabase start && npm run test:e2e   (not part of CI)
const supabase = localSupabase();
const PORT = 5100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    timezoneId: "Asia/Jakarta",
    locale: "en-GB",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results",
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: true, // reuses a server already running on the port (faster reruns)
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    },
  },
});
