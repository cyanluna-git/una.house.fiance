/**
 * TXN-01~33: 거래 API E2E 테스트
 *
 * Tests POST/GET/PATCH/DELETE /api/transactions.
 * Server runs on port 3105 via globalSetup (vitest-server-setup.ts).
 *
 * DB isolation: each describe block uses unique dates that don't collide
 * with import.test.ts (which uses 2026-02 through 2026-09).
 * TXN-01~10 group: 2025-11-xx
 * TXN-20~27 group: 2025-12-xx
 * TXN-30~33 group: 2026-10-xx
 *
 * Key API facts (confirmed from route.ts):
 *  - GET response shape: { data: Transaction[], total: number, page: number, limit: number }
 *  - POST validates date/merchant/amount (amount=0 is falsy → 400)
 *  - UNIQUE constraint: (date, merchant, amount, cardCompany) → 500 on duplicate
 *  - PATCH/DELETE on non-existent ID: returns 200 { success: true } (no existence check)
 */
import { describe, test, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3105";
const TEST_KEY = "test-key-base64";

// ---------------------------------------------------------------------------
// Auth helper
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
interface TransactionBody {
  date?: string;
  merchant?: string;
  amount?: number;
  cardCompany?: string;
  paymentType?: string;
  categoryL1?: string;
  categoryL2?: string;
  categoryL3?: string;
  sourceType?: string;
  note?: string;
  familyMemberId?: number | null;
  tripId?: number | null;
}

async function postTransaction(cookie: string, body: TransactionBody): Promise<Response> {
  return fetch(`${BASE}/api/transactions`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getTransactions(
  cookie: string,
  params?: Record<string, string>
): Promise<Response> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(`${BASE}/api/transactions${qs}`, {
    headers: { Cookie: cookie },
  });
}

interface Transaction {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  cardCompany: string;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  necessity: string;
  sourceType: string;
  isManual: boolean;
}

interface GetResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// TXN-01~10: 수동입력 유효성 검사 및 저장
// All tests in this group use dates in 2025-11-xx to avoid collisions.
// ---------------------------------------------------------------------------
describe("TXN-01~10: 수동입력", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // TXN-01: date 없음 → 400
  test("TXN-01: date 없음 → 400", async () => {
    const res = await postTransaction(cookie, {
      merchant: "TXN01_테스트",
      amount: 10000,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // TXN-02: merchant 없음 → 400
  test("TXN-02: merchant 없음 → 400", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-01",
      amount: 10000,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // TXN-03: amount=0 → 400 (falsy check: !amount treats 0 as falsy)
  test("TXN-03: amount=0 → 400 (falsy)", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-02",
      merchant: "TXN03_테스트",
      amount: 0,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // TXN-04: amount=-10000 → 200 (환불/취소 허용)
  test("TXN-04: amount=-10000 → 200 (환불 허용)", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-03",
      merchant: "TXN04_환불테스트",
      amount: -10000,
      cardCompany: "국민카드",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; id: number };
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe("number");
  });

  // TXN-05: 동일 body 2회 POST → UNIQUE constraint (date+merchant+amount+cardCompany) 위반 → 409
  // 2026-10-19: 중복은 서버 오류가 아니므로 500 대신 409 { error: "이미 같은 거래가 있습니다" }.
  test("TXN-05: 동일 body 2회 POST → 두 번째 409 (UNIQUE constraint)", async () => {
    const body: TransactionBody = {
      date: "2025-11-04",
      merchant: "TXN05_중복테스트",
      amount: 5000,
      cardCompany: "롯데카드",
    };

    const res1 = await postTransaction(cookie, body);
    expect(res1.status).toBe(200);

    // Second identical POST hits UNIQUE(date, merchant, amount, cardCompany) → 409
    const res2 = await postTransaction(cookie, body);
    expect(res2.status).toBe(409);
    const errBody = await res2.json() as { error: string };
    expect(errBody.error).toBeTruthy();
  });

  // TXN-06: merchant="스타벅스" → categoryL1="외식비", categoryL2="카페/음료" (categorizer확인)
  // seed-rules.ts: { keyword: "스타벅스", categoryL1: "외식비", categoryL2: "카페/음료", ... }
  // NECESSITY_DEFAULTS["외식비"] = "discretionary"
  test("TXN-06: merchant='스타벅스' → 카테고리 자동분류", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-05",
      merchant: "스타벅스",
      amount: 5500,
      cardCompany: "신한카드",
    });
    expect(res.status).toBe(200);
    const postBody = await res.json() as { success: boolean; id: number };
    expect(postBody.success).toBe(true);

    // Retrieve and verify category fields
    const getRes = await getTransactions(cookie, { from: "2025-11-05", to: "2025-11-05" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === "스타벅스" && t.date === "2025-11-05");
    expect(saved).toBeDefined();
    expect(saved?.categoryL1).toBe("외식비");
    expect(saved?.categoryL2).toBe("카페/음료");
    expect(saved?.necessity).toBe("discretionary");
  });

  // TXN-07: merchant="znxqwer알수없음" → default category (기타/미분류)
  test("TXN-07: merchant='znxqwer알수없음' → 기본 카테고리 (기타/미분류)", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-06",
      merchant: "znxqwer알수없음",
      amount: 9999,
      cardCompany: "국민카드",
    });
    expect(res.status).toBe(200);

    const getRes = await getTransactions(cookie, { from: "2025-11-06", to: "2025-11-06" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === "znxqwer알수없음");
    expect(saved).toBeDefined();
    expect(saved?.categoryL1).toBe("기타");
    expect(saved?.categoryL2).toBe("미분류");
  });

  // TXN-08: cardCompany="롯데카드" → DB에 card_company="롯데카드" 저장 확인
  test("TXN-08: cardCompany='롯데카드' → DB 저장 확인", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-07",
      merchant: "TXN08_롯데카드테스트",
      amount: 15000,
      cardCompany: "롯데카드",
    });
    expect(res.status).toBe(200);

    const getRes = await getTransactions(cookie, { from: "2025-11-07", to: "2025-11-07" });
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === "TXN08_롯데카드테스트");
    expect(saved).toBeDefined();
    expect(saved?.cardCompany).toBe("롯데카드");
  });

  // TXN-09: cardCompany 미제공 → DB에 card_company="수동입력" 저장 (route default: body.cardCompany || "수동입력")
  test("TXN-09: cardCompany 미제공 → card_company='수동입력' 저장", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-08",
      merchant: "TXN09_현금테스트",
      amount: 3000,
      // cardCompany intentionally omitted
    });
    expect(res.status).toBe(200);

    const getRes = await getTransactions(cookie, { from: "2025-11-08", to: "2025-11-08" });
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === "TXN09_현금테스트");
    expect(saved).toBeDefined();
    expect(saved?.cardCompany).toBe("수동입력");
  });

  // TXN-10: sourceType="manual" → DB에 source_type="manual" 저장 확인
  // The POST handler also sets isManual: true
  test("TXN-10: sourceType='manual' → DB 저장 확인", async () => {
    const res = await postTransaction(cookie, {
      date: "2025-11-09",
      merchant: "TXN10_소스타입테스트",
      amount: 20000,
      cardCompany: "하나카드",
      sourceType: "manual",
    });
    expect(res.status).toBe(200);

    const getRes = await getTransactions(cookie, { from: "2025-11-09", to: "2025-11-09" });
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === "TXN10_소스타입테스트");
    expect(saved).toBeDefined();
    expect(saved?.sourceType).toBe("manual");
    expect(saved?.isManual).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TXN-20~27: 페이지네이션/필터
// Uses 2025-12-xx dates for isolation.
// ---------------------------------------------------------------------------
describe("TXN-20~27: 페이지네이션/필터", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // TXN-20: 파라미터 없음 → { page:1, limit:50, data:[], total:N }
  test("TXN-20: 파라미터 없음 → 기본 응답 구조 확인", async () => {
    const res = await getTransactions(cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("limit");
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  // TXN-21: page=9999 → { data:[], total:N } (에러 없음, 빈 배열)
  test("TXN-21: page=9999 → 빈 data 배열, 에러 없음", async () => {
    const res = await getTransactions(cookie, { page: "9999" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.data).toEqual([]);
    expect(typeof body.total).toBe("number");
    expect(body.page).toBe(9999);
  });

  // TXN-22: limit=201 → limit clamped to 200
  test("TXN-22: limit=201 → 200으로 클램핑", async () => {
    const res = await getTransactions(cookie, { limit: "201" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.limit).toBe(200);
  });

  // TXN-23: limit=0 → fallback 50 (NaN or < 1 → 50 per route code)
  test("TXN-23: limit=0 → fallback 50", async () => {
    const res = await getTransactions(cookie, { limit: "0" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.limit).toBe(50);
  });

  // TXN-24: from=2026-04&to=2026-01 (역방향 날짜 범위) → { data:[], total:0 }
  // The route uses gte(aggregationDate, from) AND lte(aggregationDate, to).
  // No date in DB can satisfy aggregationDate >= "2026-04" AND aggregationDate <= "2026-01".
  test("TXN-24: from > to (역방향 날짜 범위) → 빈 결과", async () => {
    const res = await getTransactions(cookie, { from: "2026-04", to: "2026-01" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  // TXN-25: categoryL1=존재안함 → { data:[], total:0 }
  test("TXN-25: categoryL1=존재안함 → 빈 결과", async () => {
    const res = await getTransactions(cookie, { categoryL1: "존재안함카테고리xyz" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  // TXN-26: cardId=99999 → { data:[], total:0 }
  test("TXN-26: cardId=99999 → 빈 결과", async () => {
    const res = await getTransactions(cookie, { cardId: "99999" });
    expect(res.status).toBe(200);
    const body = await res.json() as GetResponse;
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TXN-30~33: 수정/삭제
// Uses 2026-10-xx dates for isolation.
//
// NOTE: PATCH and DELETE on non-existent IDs return 200 { success: true }
// because neither handler checks if the row existed before running the query.
// SQLite UPDATE/DELETE with a non-matching WHERE is not an error.
// ---------------------------------------------------------------------------
describe("TXN-30~33: 수정/삭제", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // TXN-30: PATCH /api/transactions/99999 → 200 (no existence check in route)
  // The route runs UPDATE WHERE id=99999 and returns { success: true } regardless.
  test("TXN-30: PATCH /api/transactions/99999 → 200 (non-existent, no check)", async () => {
    const res = await fetch(`${BASE}/api/transactions/99999`, {
      method: "PATCH",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: "test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  // TXN-31: DELETE /api/transactions/99999 → 200 (no existence check in route)
  // The route runs DELETE WHERE id=99999 and returns { success: true } regardless.
  test("TXN-31: DELETE /api/transactions/99999 → 200 (non-existent, no check)", async () => {
    const res = await fetch(`${BASE}/api/transactions/99999`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  // TXN-32: SQL injection 방어 — merchant 이름에 SQL 특수문자 포함 → 그대로 저장
  test("TXN-32: SQL injection 패턴 merchant → 안전하게 저장", async () => {
    const injectionMerchant = "'; DROP TABLE transactions; --";
    const res = await postTransaction(cookie, {
      date: "2026-10-01",
      merchant: injectionMerchant,
      amount: 1000,
      cardCompany: "국민카드",
      sourceType: "manual",
    });
    expect(res.status).toBe(200);

    // Verify the merchant was stored as-is (not executed as SQL)
    const getRes = await getTransactions(cookie, { from: "2026-10-01", to: "2026-10-01" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === injectionMerchant);
    expect(saved).toBeDefined();
    expect(saved?.merchant).toBe(injectionMerchant);
  });

  // TXN-33: 긴 merchant 이름 (255자) → 저장 성공 (SQLite text type, no length limit)
  test("TXN-33: 긴 merchant 이름 (255자) → 저장 성공", async () => {
    const longMerchant = "A".repeat(255);
    const res = await postTransaction(cookie, {
      date: "2026-10-02",
      merchant: longMerchant,
      amount: 2000,
      cardCompany: "우리카드",
      sourceType: "manual",
    });
    expect(res.status).toBe(200);

    const getRes = await getTransactions(cookie, { from: "2026-10-02", to: "2026-10-02" });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as GetResponse;
    const saved = getData.data.find((t) => t.merchant === longMerchant);
    expect(saved).toBeDefined();
    expect(saved?.merchant).toBe(longMerchant);
  });
});
