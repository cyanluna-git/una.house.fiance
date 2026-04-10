import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Unlock the app with test key
  await page.request.post("http://localhost:3104/api/auth/unlock", {
    data: { key: process.env.UNAHOUSE_ACCESS_KEY_BASE64 || "test-key-base64" },
  });

  const authDir = path.join(process.cwd(), "tests/fixtures");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  await context.storageState({ path: "tests/fixtures/.auth-state.json" });
  await browser.close();
}
