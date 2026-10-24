/**
 * CAT-01~06: 카테고리 규칙 API E2E 테스트
 *
 * Tests GET/POST/PATCH/DELETE /api/category-rules.
 * Server runs on port 3105 via globalSetup (vitest-server-setup.ts).
 *
 * DB isolation: all rule keywords are prefixed with "CAT0N_" to avoid
 * collisions with seeded rules or rules from other test files.
 * CAT-06 uses transaction date 2025-08-xx (no other test uses this range).
 *
 * Key API facts (confirmed from route.ts):
 *  - GET response shape: { data: CategoryRule[], total: number }
 *  - POST requires keyword + categoryL1; returns 201 with the created rule object
 *  - UNIQUE constraint is on keyword alone (not keyword+categoryL1)
 *    → duplicate keyword → SQLite UNIQUE violation → 500
 *  - PATCH/DELETE on non-existent ID: returns 200 { success: true } (no existence check)
 *  - DELETE on existing ID: removes rule; subsequent GET does not include it
 *
 * UI-CAT-01~04: deferred — requires Playwright + running dev server (browser tests).
 */
import { describe, test, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3105";
const TEST_KEY = "test-key-base64";

// ---------------------------------------------------------------------------
// Auth helper (inline — matches transactions.test.ts pattern)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
interface CategoryRule {
  id: number;
  keyword: string;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  priority: number;
}

interface GetRulesResponse {
  data: CategoryRule[];
  total: number;
}

async function getRules(
  cookie: string,
  params?: Record<string, string>
): Promise<Response> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(`${BASE}/api/category-rules${qs}`, {
    headers: { Cookie: cookie },
  });
}

interface PostRuleBody {
  keyword?: string;
  categoryL1?: string;
  categoryL2?: string;
  categoryL3?: string;
  priority?: number;
}

async function postRule(cookie: string, body: PostRuleBody): Promise<Response> {
  return fetch(`${BASE}/api/category-rules`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function patchRule(
  cookie: string,
  id: number,
  body: PostRuleBody
): Promise<Response> {
  return fetch(`${BASE}/api/category-rules/${id}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function deleteRule(cookie: string, id: number): Promise<Response> {
  return fetch(`${BASE}/api/category-rules/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

async function postTransaction(
  cookie: string,
  body: {
    date: string;
    merchant: string;
    amount: number;
    cardCompany?: string;
  }
): Promise<Response> {
  return fetch(`${BASE}/api/transactions`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// CAT-01~05: CRUD
// All rule keywords prefixed with "CAT0N_" to avoid collisions with seeded rules.
// ---------------------------------------------------------------------------
describe("CAT-01~05: 카테고리 규칙 CRUD", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // CAT-01: GET /api/category-rules → { data: [...], total: N }
  // Verifies the response shape even when DB may have seeded rules.
  test("CAT-01: GET /api/category-rules → 올바른 응답 구조", async () => {
    const res = await getRules(cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as GetRulesResponse;
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBe(body.data.length);
  });

  // CAT-02: POST creates a rule with keyword/categoryL1/priority → 201 + rule object
  test("CAT-02: POST → 201 + 규칙 객체 반환", async () => {
    const res = await postRule(cookie, {
      keyword: "CAT02_테스트규칙",
      categoryL1: "식비",
      categoryL2: "외식",
      priority: 15,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as CategoryRule;
    expect(typeof body.id).toBe("number");
    expect(body.keyword).toBe("CAT02_테스트규칙");
    expect(body.categoryL1).toBe("식비");
    expect(body.categoryL2).toBe("외식");
    expect(body.priority).toBe(15);
  });

  // CAT-02b: POST without optional fields → 201 with defaults
  test("CAT-02b: POST 최소 필드 (keyword+categoryL1만) → 201 + 기본값 확인", async () => {
    const res = await postRule(cookie, {
      keyword: "CAT02B_최소필드",
      categoryL1: "교통비",
    });
    expect(res.status).toBe(201);
    const body = await res.json() as CategoryRule;
    expect(body.keyword).toBe("CAT02B_최소필드");
    expect(body.categoryL1).toBe("교통비");
    expect(body.categoryL2).toBe("");
    expect(body.categoryL3).toBe("");
    // default priority is 10 per route.ts
    expect(body.priority).toBe(10);
  });

  // CAT-02c: POST without keyword → 400
  test("CAT-02c: POST keyword 없음 → 400", async () => {
    const res = await postRule(cookie, {
      categoryL1: "식비",
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // CAT-02d: POST without categoryL1 → 400
  test("CAT-02d: POST categoryL1 없음 → 400", async () => {
    const res = await postRule(cookie, {
      keyword: "CAT02D_categoryL1없음",
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // CAT-03: POST duplicate keyword → UNIQUE constraint violation → 500
  // Schema has uniqueIndex on keyword alone (uq_category_rules_keyword).
  // The route has no try/catch, so SQLite error propagates as 500.
  test("CAT-03: 동일 keyword 중복 POST → 500 (UNIQUE constraint)", async () => {
    const firstRes = await postRule(cookie, {
      keyword: "CAT03_중복키워드",
      categoryL1: "식비",
    });
    expect(firstRes.status).toBe(201);

    // Second POST with same keyword (different L1) → UNIQUE violation → 500
    const secondRes = await postRule(cookie, {
      keyword: "CAT03_중복키워드",
      categoryL1: "교통비",
    });
    expect(secondRes.status).toBe(500);
  });

  // CAT-04: PATCH /api/category-rules/:id → keyword/priority 수정 성공
  test("CAT-04: PATCH → keyword/priority 수정", async () => {
    // Create a rule to patch
    const createRes = await postRule(cookie, {
      keyword: "CAT04_원래키워드",
      categoryL1: "문화생활",
      priority: 5,
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as CategoryRule;
    const id = created.id;

    // Patch keyword and priority
    const patchRes = await patchRule(cookie, id, {
      keyword: "CAT04_수정된키워드",
      priority: 50,
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json() as { success: boolean };
    expect(patchBody.success).toBe(true);

    // Verify via GET with search
    const getRes = await getRules(cookie, { search: "CAT04_수정된키워드" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetRulesResponse;
    const found = getData.data.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.keyword).toBe("CAT04_수정된키워드");
    expect(found?.priority).toBe(50);
    // categoryL1 should be unchanged
    expect(found?.categoryL1).toBe("문화생활");
  });

  // CAT-04b: PATCH /api/category-rules/99999 → 200 { success: true } (no existence check)
  test("CAT-04b: PATCH 존재하지 않는 ID → 200 (존재 여부 확인 없음)", async () => {
    const res = await patchRule(cookie, 99999, { keyword: "CAT04B_없는ID" });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  // CAT-04c: PATCH with no updatable fields → 400
  test("CAT-04c: PATCH 빈 body → 400", async () => {
    const res = await fetch(`${BASE}/api/category-rules/1`, {
      method: "PATCH",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  // CAT-05: DELETE → 삭제된 규칙이 GET 응답에 없음
  test("CAT-05: DELETE → 규칙 삭제 확인", async () => {
    // Create a rule to delete
    const createRes = await postRule(cookie, {
      keyword: "CAT05_삭제대상",
      categoryL1: "의류",
      priority: 3,
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as CategoryRule;
    const id = created.id;

    // Delete it
    const deleteRes = await deleteRule(cookie, id);
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json() as { success: boolean };
    expect(deleteBody.success).toBe(true);

    // Verify it's gone from GET
    const getRes = await getRules(cookie, { search: "CAT05_삭제대상" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetRulesResponse;
    const found = getData.data.find((r) => r.id === id);
    expect(found).toBeUndefined();
  });

  // CAT-05b: DELETE /api/category-rules/99999 → 200 { success: true } (no existence check)
  test("CAT-05b: DELETE 존재하지 않는 ID → 200 (존재 여부 확인 없음)", async () => {
    const res = await deleteRule(cookie, 99999);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CAT-06: priority 우선순위 테스트 (E2E)
// Uses transaction date 2025-08-xx (no other test uses this range).
//
// Design: UNIQUE constraint prevents two rules with the same keyword.
// Instead, use two different keywords that both substring-match the same merchant:
//   Rule A: keyword="CAT06_testcoffee" (longer, higher priority = 20) → 외식비
//   Rule B: keyword="CAT06_test"       (shorter, lower priority  =  5) → 교통비
// Merchant: "CAT06_testcoffee_shop" — both keywords match via includes(),
// but the categorizer iterates rules in DESC priority order and returns on
// the first match. Rule A (priority=20) should win → categoryL1="외식비".
// ---------------------------------------------------------------------------
describe("CAT-06: priority 높은 규칙이 먼저 적용됨", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  test("CAT-06: 동일 merchant에 우선순위 다른 두 규칙 → 높은 우선순위 규칙 적용", async () => {
    // Rule A: higher priority, matches the merchant
    const resA = await postRule(cookie, {
      keyword: "CAT06_testcoffee",
      categoryL1: "외식비",
      categoryL2: "카페/음료",
      priority: 20,
    });
    expect(resA.status).toBe(201);

    // Rule B: lower priority, also matches (shorter keyword is a substring)
    const resB = await postRule(cookie, {
      keyword: "CAT06_test",
      categoryL1: "교통비",
      categoryL2: "대중교통",
      priority: 5,
    });
    expect(resB.status).toBe(201);

    // Create a transaction whose merchant matches both keywords
    const merchant = "CAT06_testcoffee_shop";
    const txRes = await postTransaction(cookie, {
      date: "2096-08-01",
      merchant,
      amount: 4500,
      cardCompany: "신한카드",
    });
    expect(txRes.status).toBe(200);

    // Retrieve and verify the higher-priority rule won
    const getRes = await fetch(`${BASE}/api/transactions?from=2096-08-01&to=2096-08-01`, {
      headers: { Cookie: cookie },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as {
      data: Array<{
        merchant: string;
        categoryL1: string;
        categoryL2: string;
      }>;
    };
    const saved = getData.data.find((t) => t.merchant === merchant);
    expect(saved).toBeDefined();
    // Rule A (priority=20, categoryL1="외식비") should have matched first
    expect(saved?.categoryL1).toBe("외식비");
    expect(saved?.categoryL2).toBe("카페/음료");
  });
});
