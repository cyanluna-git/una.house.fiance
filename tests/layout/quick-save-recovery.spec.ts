import { test, expect } from "@playwright/test";

test("partial save keeps skipped entries and their edited values for retry", async ({ page }) => {
  await page.request.post("/api/auth/unlock", { data: { key: "layout-test-key" } });
  await page.route("**/api/cards", r => r.fulfill({ json: { data: [] } }));
  await page.route("**/api/quick-entry/parse", r => r.fulfill({ json: { entries: ["Saved shop", "Retry shop"].map(merchant => ({
    date: "2026-10-24", merchant, amount: 1000, cardCompany: "현금", categoryL1: "기타", categoryL2: "", categoryL3: "", necessity: "unset", duplicate: { level: "none", reason: "" },
  })) } }));
  let count = 0;
  await page.route("**/api/quick-entry/commit", async r => {
    count++;
    if (count === 1) await r.fulfill({ json: { savedCount: 1, savedIds: [1], skipped: [{ index: 1, reason: "카드 확인 필요" }], results: [
      { index: 0, status: "saved", transactionId: 1 }, { index: 1, status: "skipped", reason: "카드 확인 필요" },
    ] } });
    else {
      expect(r.request().postDataJSON().entries.map((e: { merchant: string }) => e.merchant)).toEqual(["Retry shop"]);
      await r.fulfill({ json: { savedCount: 1, savedIds: [2], skipped: [], results: [{ index: 0, status: "saved", transactionId: 2 }] } });
    }
  });
  await page.goto("/quick");
  await page.locator("textarea").fill("test");
  await page.getByRole("button", { name: "분석", exact: true }).click();
  await page.getByRole("button", { name: "선택 2건 저장" }).click();
  await expect(page.getByText("Saved shop", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Retry shop", { exact: true })).toBeVisible();
  await expect(page.getByText("카드 확인 필요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "선택 1건 저장" }).click();
  await expect(page.getByText("Retry shop", { exact: true })).toHaveCount(0);
});
