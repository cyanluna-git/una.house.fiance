import { defineConfig } from "@playwright/test";
import * as path from "path";

/**
 * 모바일/태블릿 레이아웃 검사 전용 설정 (pnpm test:layout).
 * - 운영 빌드(next start)를 테스트 DB 복사본으로 띄운다. 먼저 pnpm build 필요.
 * - 로그인은 테스트 안에서 직접 한다 (기존 e2e globalSetup과 분리).
 * - 브라우저 경로를 PW_CHROME_EXE로 줄 수 있다 (없으면 Playwright 기본 설치본).
 */
const PORT = 3106;

export default defineConfig({
  testDir: "tests/layout",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: process.env.PW_CHROME_EXE ? { executablePath: process.env.PW_CHROME_EXE } : {},
  },
  webServer: {
    command: `node_modules/.bin/next start -p ${PORT} -H 127.0.0.1`,
    port: PORT,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      UNAHOUSE_DB_PATH: path.resolve(process.env.LAYOUT_TEST_DB ?? "test.db"),
      UNAHOUSE_ACCESS_KEY_BASE64: "layout-test-key",
      AI_BASE_URL: "http://127.0.0.1:1",
    },
  },
});
