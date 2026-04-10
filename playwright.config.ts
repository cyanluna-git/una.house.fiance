import { defineConfig } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: ".env.test" });

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 1,
  globalSetup: "tests/fixtures/global-setup.ts",
  globalTeardown: "tests/fixtures/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3105",
    storageState: "tests/fixtures/.auth-state.json",
  },
  webServer: {
    command: "node_modules/.bin/next dev -p 3105",
    port: 3105,
    reuseExistingServer: false,
    env: {
      UNAHOUSE_DB_PATH: path.resolve("test.db"),
      UNAHOUSE_ACCESS_KEY_BASE64: "test-key-base64",
    },
  },
});
