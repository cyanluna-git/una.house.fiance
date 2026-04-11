import { test, expect } from "@playwright/test";
import {
  createKookminXlsx,
  type KookminRow,
} from "../fixtures/xlsx-helpers";

const BASE = "http://localhost:3105";
const TEST_KEY = "test-key-base64";

async function getAuthCookie(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: TEST_KEY }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/unahouse_auth=[^;]+/);
  return match ? match[0] : "";
}

async function postImport(
  cookie: string,
  blob: Blob,
  fileName: string
): Promise<Response> {
  const formData = new FormData();
  formData.append("file", blob, fileName);
  return fetch(`${BASE}/api/import`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
}

test.describe("E2E-01: 신규 사용자 플로우", () => {
  test("dashboard totalSpend increases after manual transaction", async () => {
    const cookie = await getAuthCookie();
    // Step 1: capture initial spend
    const before = await fetch(`${BASE}/api/dashboard?month=2024-01`, {
      headers: { Cookie: cookie },
    });
    const beforeBody = await before.json() as { totalSpend: number };
    const initialSpend = beforeBody.totalSpend as number;

    // Step 2: create manual transaction
    const postRes = await fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        date: "2024-01-15",
        merchant: "E2E01_가게",
        amount: 12345,
        cardCompany: "국민카드",
        sourceType: "manual",
      }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json() as { success: boolean };
    expect(postBody.success).toBe(true);

    // Step 3: verify dashboard updated
    const after = await fetch(`${BASE}/api/dashboard?month=2024-01`, {
      headers: { Cookie: cookie },
    });
    const afterBody = await after.json() as { totalSpend: number };
    expect(afterBody.totalSpend).toBe(initialSpend + 12345);
  });
});

test.describe("E2E-02: 수동↔임포트 충돌", () => {
  test("import skips entry matching manual transaction (date+amount+cardCompany)", async () => {
    const cookie = await getAuthCookie();

    // Step 1: manual transaction
    const manualRes = await fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        date: "2024-02-10",
        merchant: "E2E02_수동상점",
        amount: 50000,
        cardCompany: "국민카드",
        sourceType: "manual",
      }),
    });
    expect(manualRes.status).toBe(200);

    // Step 2: import xlsx with same date/amount/cardCompany but different merchant
    const rows: KookminRow[] = [
      { date: "2024-02-10", merchant: "E2E02_카드상점", amount: 50000 },
    ];
    const xlsxBuf = createKookminXlsx(rows);
    const blob = new Blob([xlsxBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const importRes = await postImport(cookie, blob, "국민.xlsx");
    expect(importRes.status).toBe(200);
    const importBody = await importRes.json() as { skippedManualDuplicates: number };

    // Step 3: assert duplicate was caught
    expect(importBody.skippedManualDuplicates).toBe(1);

    // Step 4: only 1 record in DB for this date+amount+card
    const txRes = await fetch(
      `${BASE}/api/transactions?from=2024-02-10&to=2024-02-10`,
      { headers: { Cookie: cookie } }
    );
    const txBody = await txRes.json() as { data: Array<{ amount: number; cardCompany: string; merchant: string }> };
    const matches = txBody.data.filter(
      (t) => t.amount === 50000 && t.cardCompany === "국민카드"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].merchant).toBe("E2E02_수동상점");
  });
});

test.describe("E2E-03: 카테고리 자동분류", () => {
  test("imported transaction gets category from matching rule", async () => {
    const cookie = await getAuthCookie();

    // Step 1: add category rule
    const ruleRes = await fetch(`${BASE}/api/category-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        keyword: "E2E03_테스트상점",
        categoryL1: "식비",
        categoryL2: "외식",
        priority: 99,
      }),
    });
    expect(ruleRes.status).toBe(201);
    const ruleBody = await ruleRes.json() as { id: number };
    const ruleId: number = ruleBody.id;

    // Step 2: import file with matching merchant
    const rows: KookminRow[] = [
      { date: "2024-03-15", merchant: "E2E03_테스트상점마트", amount: 8900 },
    ];
    const xlsxBuf = createKookminXlsx(rows);
    const blob = new Blob([xlsxBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const importRes = await postImport(cookie, blob, "국민.xlsx");
    expect(importRes.status).toBe(200);
    const importBody = await importRes.json() as { savedCount: number };
    expect(importBody.savedCount).toBeGreaterThanOrEqual(1);

    // Step 3: verify category assigned - no merchant query param, JS filter instead
    const txRes = await fetch(
      `${BASE}/api/transactions?from=2024-03-01&to=2024-03-31`,
      { headers: { Cookie: cookie } }
    );
    const txBody = await txRes.json() as { data: Array<{ merchant: string; categoryL1: string }> };
    const tx = txBody.data.find((t) => t.merchant.includes("E2E03_테스트상점"));
    expect(tx).toBeDefined();
    expect(tx!.categoryL1).toBe("식비");

    // Cleanup: delete the rule
    await fetch(`${BASE}/api/category-rules/${ruleId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  });
});

test.describe("E2E-04: 카테고리 재분류", () => {
  test("category changes after PATCH and is reflected in GET", async () => {
    const cookie = await getAuthCookie();

    // Step 1: create transaction with initial category
    const postRes = await fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        date: "2024-04-20",
        merchant: "E2E04_변경상점",
        amount: 3000,
        cardCompany: "국민카드",
        categoryL1: "식비",
        sourceType: "manual",
      }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json() as { success: boolean; id: number };
    const txId: number = postBody.id;

    // Step 2: reclassify
    const patchRes = await fetch(`${BASE}/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ categoryL1: "교통" }),
    });
    expect(patchRes.status).toBe(200);

    // Step 3: verify - JS filter, not merchant query param
    const txRes = await fetch(
      `${BASE}/api/transactions?from=2024-04-01&to=2024-04-30`,
      { headers: { Cookie: cookie } }
    );
    const txBody = await txRes.json() as { data: Array<{ merchant: string; categoryL1: string }> };
    const tx = txBody.data.find((t) => t.merchant === "E2E04_변경상점");
    expect(tx).toBeDefined();
    expect(tx!.categoryL1).toBe("교통");
  });
});

test.describe("E2E-05: 고정지출 월 집계", () => {
  test("fixedExpenseMonthly increases after active fixed expense registration", async () => {
    const cookie = await getAuthCookie();

    // Step 1: capture initial
    const beforeRes = await fetch(`${BASE}/api/dashboard?month=2024-05`, {
      headers: { Cookie: cookie },
    });
    const beforeBody = await beforeRes.json() as { fixedExpenseMonthly: number };
    const initialFixed = beforeBody.fixedExpenseMonthly as number;

    // Step 2: register active fixed expense (no endDate → isActive: true)
    // NOTE: FIX-01 in fixed-loans-analytics.test.ts inserts 500000/mo active expense.
    // calcMonthlyAmount for monthly frequency ignores startDate, so ALL active monthly
    // expenses count in every month. Use >= to tolerate accumulation.
    const postRes = await fetch(`${BASE}/api/fixed-expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "E2E05_월세",
        category: "주거",
        amount: 300000,
        frequency: "monthly",
        startDate: "2024-05-01",
        // no endDate → isActive: true
      }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json() as { success: boolean; id: number };
    const fixId: number = postBody.id;

    // Step 3: verify dashboard
    const afterRes = await fetch(`${BASE}/api/dashboard?month=2024-05`, {
      headers: { Cookie: cookie },
    });
    const afterBody = await afterRes.json() as { fixedExpenseMonthly: number };
    expect(afterBody.fixedExpenseMonthly).toBeGreaterThanOrEqual(initialFixed + 300000);

    // Cleanup: deactivate (PUT with endDate)
    await fetch(`${BASE}/api/fixed-expenses/${fixId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "E2E05_월세",
        category: "주거",
        amount: 300000,
        startDate: "2024-05-01",
        endDate: "2024-05-01", // set endDate to deactivate
      }),
    });
  });
});

test.describe("E2E-06: 인증 만료", () => {
  // CRITICAL-1: API routes → 401, page routes → 307

  test("E2E-06a: valid cookie allows GET /api/transactions", async () => {
    const cookie = await getAuthCookie();
    const res = await fetch(`${BASE}/api/transactions`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
  });

  test("E2E-06b: no cookie → GET /api/transactions returns 401 (not 307)", async () => {
    // CRITICAL-1 fix: API routes return 401 JSON, NOT 307 redirect
    const res = await fetch(`${BASE}/api/transactions`, {
      redirect: "manual",
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: unknown };
    expect(body.error).toBeTruthy();
  });

  test("E2E-06c: no cookie → page /transactions redirects to /unlock", async ({
    browser,
  }) => {
    // CRITICAL-1: page routes return 307 redirect
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/transactions`, { waitUntil: "commit" });
    expect(page.url()).toContain("/unlock");
    await ctx.close();
  });

  test("E2E-06d: invalid cookie → page /transactions redirects to /unlock", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await ctx.addCookies([
      {
        name: "unahouse_auth",
        value: "invalid_hash_value_xxxx",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(`${BASE}/transactions`, { waitUntil: "commit" });
    expect(page.url()).toContain("/unlock");
    await ctx.close();
  });
});

test.describe("E2E-07: 여행 예산 추적", () => {
  test("trip totalExpense accumulates linked transactions", async () => {
    const cookie = await getAuthCookie();

    // Step 1: create trip
    const tripRes = await fetch(`${BASE}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "E2E07_제주여행",
        budget: 100000,
        startDate: "2024-07-01",
        endDate: "2024-07-07",
      }),
    });
    expect(tripRes.status).toBe(200);
    const tripBody = await tripRes.json() as { success: boolean; id: number };
    const tripId: number = tripBody.id;

    // Step 2: link 2 transactions to trip
    await fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        date: "2024-07-03",
        merchant: "E2E07_카페",
        amount: 15000,
        cardCompany: "국민카드",
        tripId,
        sourceType: "manual",
      }),
    });
    await fetch(`${BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        date: "2024-07-05",
        merchant: "E2E07_식당",
        amount: 30000,
        cardCompany: "국민카드",
        tripId,
        sourceType: "manual",
      }),
    });

    // Step 3: GET /api/trips (no /trips/:id endpoint), filter by id in JS
    const tripsRes = await fetch(`${BASE}/api/trips`, {
      headers: { Cookie: cookie },
    });
    expect(tripsRes.status).toBe(200);
    const tripsBody = await tripsRes.json() as { data: Array<{ id: number; totalExpense: number; budget: number }> };
    const trip = tripsBody.data.find((t) => t.id === tripId);
    expect(trip).toBeDefined();

    // Step 4: verify totalExpense
    expect(trip!.totalExpense).toBe(45000);
    expect(trip!.budget).toBe(100000);
  });

  test("E2E-07b: trip with null budget shows totalExpense only", async () => {
    const cookie = await getAuthCookie();

    const tripRes = await fetch(`${BASE}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "E2E07b_무예산여행",
        // no budget
      }),
    });
    expect(tripRes.status).toBe(200);
    const { id: tripId } = await tripRes.json() as { id: number };

    const tripsRes = await fetch(`${BASE}/api/trips`, {
      headers: { Cookie: cookie },
    });
    const { data } = await tripsRes.json() as { data: Array<{ id: number; budget: number | null; totalExpense: number }> };
    const trip = data.find((t) => t.id === tripId);
    expect(trip).toBeDefined();
    expect(trip!.budget).toBeNull();
    expect(typeof trip!.totalExpense).toBe("number");
  });
});
