import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // PGlite boots a real Postgres in WebAssembly and runs every migration in
    // beforeAll; a cold start on CI can take well over the 10s default.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
