import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/api/**/*.test.ts"],
    environment: "node",
    env: {
      UNAHOUSE_DB_PATH: "test.db",
      UNAHOUSE_ACCESS_KEY_BASE64: "test-key-base64",
    },
  },
});
