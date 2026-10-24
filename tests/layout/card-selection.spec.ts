import { test, expect } from "@playwright/test";

test("receipt review selects active products and submits the selected card", async ({ page }) => {
  await page.request.post("/api/auth/unlock", { data: { key: "layout-test-key" } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/cards", (route) => route.fulfill({ json: { data: [
    { id: 101, cardCompany: "Test issuer", cardName: "Active product", isActive: true },
    { id: 102, cardCompany: "Test issuer", cardName: "Cancelled product", isActive: false },
  ] } }));
  await page.route("**/api/quick-entry/receipt", (route) => route.fulfill({ json: { entries: [{
    date: "2026-10-24", merchant: "Test shop", amount: 10000, cardCompany: "Test issuer",
    categoryL1: "기타", categoryL2: "", categoryL3: "", necessity: "unset",
    receipt: { check: "ok", itemsSum: 10000, total: 10000, diff: 0, warnings: [], items: [] },
    duplicate: { level: "none", reason: "" },
  }] } }));
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/quick-entry/commit", async (route) => {
    saved = route.request().postDataJSON().entries[0];
    await route.fulfill({ json: { savedCount: 1, skipped: [] } });
  });
  await page.goto("/quick");
  await page.getByRole("button", { name: "영수증 사진", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("test") });
  await page.getByRole("button", { name: /분석/ }).click();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  const select = page.getByLabel("카드", { exact: true });
  await expect(select.locator("option", { hasText: "Active product" })).toHaveCount(1);
  await expect(select.locator("option", { hasText: "Cancelled product" })).toHaveCount(0);
  await select.selectOption("101");
  await page.getByRole("button", { name: "선택 1건 저장" }).click();
  await expect.poll(() => saved?.cardId).toBe(101);
  expect(saved).toMatchObject({ cardId: 101, cardCompany: "Test issuer", cardName: "Active product" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("receipt last four uniquely preselects an active product", async ({ page }) => {
  await page.request.post("/api/auth/unlock", { data: { key: "layout-test-key" } });
  await page.route("**/api/cards", r => r.fulfill({ json: { data: [
    { id: 101, cardCompany: "Test issuer", cardName: "Unique product", cardNumber: "1234", isActive: true },
    { id: 102, cardCompany: "Test issuer", cardName: "Other product", cardNumber: "5678", isActive: true },
  ] } }));
  await page.route("**/api/quick-entry/receipt", r => r.fulfill({ json: { entries: [{
    date: "2026-10-24", merchant: "Auto shop", amount: 1000, cardCompany: "Test issuer", cardLast4: "1234", categoryL1: "기타", categoryL2: "", categoryL3: "", necessity: "unset", duplicate: { level: "none", reason: "" },
  }] } }));
  await page.goto("/quick");
  await page.getByRole("button", { name: "영수증 사진", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("test") });
  await page.getByRole("button", { name: /분석/ }).click();
  await expect(page.getByText("Unique product", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("카드", { exact: true })).toHaveValue("101");
});
