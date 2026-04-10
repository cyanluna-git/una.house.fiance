/**
 * FIX-01~08 (고정지출 CRUD), LOAN-01~05 (대출 CRUD + cascade), ANL-01~06 (분석)
 *
 * Server runs on port 3105 via globalSetup (vitest-server-setup.ts).
 *
 * Key API facts (confirmed from route inspection):
 *  - POST /api/fixed-expenses: returns 200 (no 201 override), { success, id }
 *  - PUT /api/fixed-expenses/[id]: route exports PUT (not PATCH)
 *  - DELETE /api/fixed-expenses/[id]: 404 if not found
 *  - POST with endDate → isActive=false (line 72 of POST route)
 *  - endDate < startDate: NO server validation — accepted silently
 *  - paymentMethod is a free-text column — SQLite does not enforce enum
 *  - frequency=annual: annualDate MM-DD regex must match (FIX-08: "02-29" passes regex)
 *  - DELETE /api/loans/[id]: cascades to loanRepayments, NOT transactions
 *
 * DB isolation dates:
 *  FIX tests:  2025-06-xx
 *  LOAN tests: 2025-07-xx
 *  ANL tests:  2025-08-xx (transactions inserted to known months 2025-08 / 2025-09)
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
// Fixed expenses helpers
// ---------------------------------------------------------------------------
interface FixedExpenseBody {
  name?: string;
  category?: string;
  amount?: number;
  frequency?: string;
  weekdays?: number[];
  annualDate?: string;
  paymentDay?: number;
  paymentMethod?: string;
  recipient?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  note?: string;
}

async function postFixedExpense(
  cookie: string,
  body: FixedExpenseBody
): Promise<Response> {
  return fetch(`${BASE}/api/fixed-expenses`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getFixedExpenses(cookie: string): Promise<Response> {
  return fetch(`${BASE}/api/fixed-expenses`, {
    headers: { Cookie: cookie },
  });
}

async function putFixedExpense(
  cookie: string,
  id: number,
  body: FixedExpenseBody
): Promise<Response> {
  return fetch(`${BASE}/api/fixed-expenses/${id}`, {
    method: "PUT",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteFixedExpense(
  cookie: string,
  id: number
): Promise<Response> {
  return fetch(`${BASE}/api/fixed-expenses/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

// ---------------------------------------------------------------------------
// Loan helpers
// ---------------------------------------------------------------------------
interface LoanBody {
  loanType?: string;
  loanName?: string;
  lender?: string;
  originalAmount?: number;
  outstandingAmount?: number;
  interestRate?: number;
  startDate?: string;
  endDate?: string;
  note?: string;
}

async function postLoan(cookie: string, body: LoanBody): Promise<Response> {
  return fetch(`${BASE}/api/loans`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getLoans(cookie: string): Promise<Response> {
  return fetch(`${BASE}/api/loans`, {
    headers: { Cookie: cookie },
  });
}

async function putLoan(
  cookie: string,
  id: number,
  body: LoanBody
): Promise<Response> {
  return fetch(`${BASE}/api/loans/${id}`, {
    method: "PUT",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteLoan(cookie: string, id: number): Promise<Response> {
  return fetch(`${BASE}/api/loans/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

async function postLoanRepayment(
  cookie: string,
  loanId: number,
  body: { date: string; principalAmount: number; interestAmount: number; memo?: string }
): Promise<Response> {
  return fetch(`${BASE}/api/loans/${loanId}/repayments`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getLoanRepayments(
  cookie: string,
  loanId: number
): Promise<Response> {
  return fetch(`${BASE}/api/loans/${loanId}/repayments`, {
    headers: { Cookie: cookie },
  });
}

// ---------------------------------------------------------------------------
// Transaction helper (for ANL tests)
// ---------------------------------------------------------------------------
interface TransactionBody {
  date: string;
  merchant: string;
  amount: number;
  cardCompany?: string;
  sourceType?: string;
  categoryL1?: string;
  isCompanyExpense?: boolean;
}

async function postTransaction(
  cookie: string,
  body: TransactionBody
): Promise<Response> {
  return fetch(`${BASE}/api/transactions`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getDashboard(
  cookie: string,
  month?: string
): Promise<Response> {
  const qs = month ? `?month=${month}` : "";
  return fetch(`${BASE}/api/dashboard${qs}`, {
    headers: { Cookie: cookie },
  });
}

// ===========================================================================
// FIX-01~08: 고정지출 CRUD
// ===========================================================================
describe("FIX-01~08: 고정지출 CRUD", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // FIX-01: POST name/amount/category → 200 { success, id }
  test("FIX-01: 필수 필드 전달 시 200 성공", async () => {
    const res = await postFixedExpense(cookie, {
      name: "FIX01_월세",
      category: "주거",
      amount: 500000,
      startDate: "2025-06-01",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; id: number };
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe("number");
  });

  // FIX-02: 필수 필드 누락 → 400
  test("FIX-02: 필수 필드 누락(name 없음) → 400", async () => {
    const res = await postFixedExpense(cookie, {
      category: "공과금",
      amount: 30000,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // FIX-03: endDate < startDate → 서버 미검증 → 200 수락
  test("FIX-03: endDate < startDate → 서버 검증 없어 200 수락", async () => {
    const res = await postFixedExpense(cookie, {
      name: "FIX03_검증테스트",
      category: "기타",
      amount: 1000,
      startDate: "2025-06-30",
      endDate: "2025-06-01", // endDate before startDate — no server validation
    });
    // The API does not validate date ordering; it silently accepts
    expect(res.status).toBe(200);
  });

  // FIX-04: endDate 있으면 isActive=false → GET 목록에는 포함
  test("FIX-04: endDate 있으면 isActive=false → GET 목록에 포함됨", async () => {
    const postRes = await postFixedExpense(cookie, {
      name: "FIX04_종료항목",
      category: "보험",
      amount: 150000,
      startDate: "2025-06-01",
      endDate: "2025-06-30", // triggers isActive=false in POST route line 72
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    const listRes = await getFixedExpenses(cookie);
    expect(listRes.status).toBe(200);
    const { data } = await listRes.json() as { data: Array<{ id: number; isActive: boolean; endDate: string | null }> };
    const found = data.find((fe) => fe.id === id);
    expect(found).toBeDefined();
    expect(found?.isActive).toBe(false);
  });

  // FIX-05: PUT paymentMethod 변경 → 200
  test("FIX-05: PUT으로 paymentMethod 필드 변경 → 200", async () => {
    // Create first
    const postRes = await postFixedExpense(cookie, {
      name: "FIX05_이체수단",
      category: "공과금",
      amount: 20000,
      startDate: "2025-06-01",
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    // Update paymentMethod
    const putRes = await putFixedExpense(cookie, id, {
      paymentMethod: "지역상품권",
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json() as { success: boolean };
    expect(putBody.success).toBe(true);

    // Verify updated value
    const listRes = await getFixedExpenses(cookie);
    const { data } = await listRes.json() as { data: Array<{ id: number; paymentMethod: string | null }> };
    const updated = data.find((fe) => fe.id === id);
    expect(updated?.paymentMethod).toBe("지역상품권");
  });

  // FIX-06: paymentMethod enum 외 값 → SQLite 비강제 → 200 저장됨
  test("FIX-06: enum 외 paymentMethod 값 → SQLite 비강제로 저장됨", async () => {
    const postRes = await postFixedExpense(cookie, {
      name: "FIX06_이상이체",
      category: "기타",
      amount: 5000,
      startDate: "2025-06-01",
      paymentMethod: "바나나포인트", // non-enum value
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    const listRes = await getFixedExpenses(cookie);
    const { data } = await listRes.json() as { data: Array<{ id: number; paymentMethod: string | null }> };
    const found = data.find((fe) => fe.id === id);
    expect(found?.paymentMethod).toBe("바나나포인트");
  });

  // FIX-07: DELETE → GET 목록에서 제외
  test("FIX-07: DELETE 후 GET 목록에서 제외됨", async () => {
    const postRes = await postFixedExpense(cookie, {
      name: "FIX07_삭제예정",
      category: "기타",
      amount: 9999,
      startDate: "2025-06-15",
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    const delRes = await deleteFixedExpense(cookie, id);
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json() as { success: boolean };
    expect(delBody.success).toBe(true);

    const listRes = await getFixedExpenses(cookie);
    const { data } = await listRes.json() as { data: Array<{ id: number }> };
    const found = data.find((fe) => fe.id === id);
    expect(found).toBeUndefined();
  });

  // FIX-08: frequency=annual, annualDate="02-29" → regex \d{2}-\d{2} 통과 → 200
  test("FIX-08: frequency=annual, annualDate='02-29' → regex 통과 200", async () => {
    const res = await postFixedExpense(cookie, {
      name: "FIX08_연간항목",
      category: "기타",
      amount: 100000,
      frequency: "annual",
      annualDate: "02-29", // passes /^\d{2}-\d{2}$/ regex, no calendar validation
      startDate: "2025-06-01",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; id: number };
    expect(body.success).toBe(true);
  });

  // FIX-08a: frequency=annual, annualDate 누락 → 400
  test("FIX-08a: frequency=annual, annualDate 없음 → 400", async () => {
    const res = await postFixedExpense(cookie, {
      name: "FIX08a_연간누락",
      category: "기타",
      amount: 50000,
      frequency: "annual",
      startDate: "2025-06-01",
      // annualDate omitted
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // FIX-08b: frequency=weekly, weekdays 누락 → 400
  test("FIX-08b: frequency=weekly, weekdays 없음 → 400", async () => {
    const res = await postFixedExpense(cookie, {
      name: "FIX08b_주간누락",
      category: "기타",
      amount: 10000,
      frequency: "weekly",
      startDate: "2025-06-01",
      // weekdays omitted
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // FIX-09: DELETE non-existent id → 404
  test("FIX-09: 존재하지 않는 id DELETE → 404", async () => {
    const res = await deleteFixedExpense(cookie, 9999999);
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// LOAN-01~05: 대출 CRUD + repayment cascade
// ===========================================================================
describe("LOAN-01~05: 대출 CRUD", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // LOAN-01: POST 필수 필드 → 200 { success, id }
  test("LOAN-01: 필수 필드 전달 시 200 성공", async () => {
    const res = await postLoan(cookie, {
      loanType: "신용",
      loanName: "LOAN01_신용대출",
      lender: "카카오뱅크",
      originalAmount: 10000000,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; id: number };
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe("number");
  });

  // LOAN-02: 필수 필드 누락 → 400
  test("LOAN-02: 필수 필드 누락(loanName 없음) → 400", async () => {
    const res = await postLoan(cookie, {
      loanType: "신용",
      lender: "토스뱅크",
      originalAmount: 5000000,
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  // LOAN-03: PUT으로 금리 수정 → 200
  test("LOAN-03: PUT으로 interestRate 수정 → 200", async () => {
    const postRes = await postLoan(cookie, {
      loanType: "장기주택",
      loanName: "LOAN03_주택담보",
      lender: "국민은행",
      originalAmount: 50000000,
      interestRate: 4.5,
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    const putRes = await putLoan(cookie, id, { interestRate: 3.9 });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json() as { success: boolean };
    expect(putBody.success).toBe(true);
  });

  // LOAN-04: DELETE 후 GET 목록에서 제외
  test("LOAN-04: DELETE 후 GET 목록에서 제외됨", async () => {
    const postRes = await postLoan(cookie, {
      loanType: "기타",
      loanName: "LOAN04_삭제예정",
      lender: "친척",
      originalAmount: 1000000,
    });
    expect(postRes.status).toBe(200);
    const { id } = await postRes.json() as { id: number };

    const delRes = await deleteLoan(cookie, id);
    expect(delRes.status).toBe(200);

    const listRes = await getLoans(cookie);
    const { data } = await listRes.json() as { data: Array<{ id: number }> };
    const found = data.find((l) => l.id === id);
    expect(found).toBeUndefined();
  });

  // LOAN-05: DELETE cascades to loanRepayments (not transactions)
  test("LOAN-05: 대출 삭제 시 상환내역(loanRepayments) 연쇄 삭제", async () => {
    // Create loan
    const postRes = await postLoan(cookie, {
      loanType: "신용",
      loanName: "LOAN05_cascade테스트",
      lender: "하나은행",
      originalAmount: 3000000,
      outstandingAmount: 3000000,
      interestRate: 5.0,
    });
    expect(postRes.status).toBe(200);
    const { id: loanId } = await postRes.json() as { id: number };

    // Add a repayment
    const repRes = await postLoanRepayment(cookie, loanId, {
      date: "2025-07-10",
      principalAmount: 100000,
      interestAmount: 12500,
    });
    expect(repRes.status).toBe(200);

    // Verify repayment exists
    const repListBefore = await getLoanRepayments(cookie, loanId);
    expect(repListBefore.status).toBe(200);
    const beforeBody = await repListBefore.json() as { data: Array<{ id: number }> };
    expect(beforeBody.data.length).toBeGreaterThan(0);

    // Delete the loan → should cascade-delete loanRepayments
    const delRes = await deleteLoan(cookie, loanId);
    expect(delRes.status).toBe(200);

    // Loan is gone — repayments endpoint should 404
    const repListAfter = await getLoanRepayments(cookie, loanId);
    expect(repListAfter.status).toBe(404);
  });
});

// ===========================================================================
// ANL-01~06: 분석 (dashboard)
// ===========================================================================
describe("ANL-01~06: 분석 (dashboard)", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie();
  });

  // ANL-01: 거래 0건 월 → incomeTotal=0, totalSpend=0
  test("ANL-01: 거래 없는 월 → incomeTotal=0, totalSpend=0", async () => {
    const res = await getDashboard(cookie, "1999-01");
    expect(res.status).toBe(200);
    const body = await res.json() as { incomeTotal: number; totalSpend: number };
    expect(body.incomeTotal).toBe(0);
    expect(body.totalSpend).toBe(0);
  });

  // ANL-02: 단일 카테고리 → categoryBreakdown length=1
  test("ANL-02: 단일 카테고리 월 → categoryBreakdown length=1", async () => {
    // Insert two transactions in same category for a unique month
    await postTransaction(cookie, {
      date: "2025-08-01",
      merchant: "ANL02_식당A",
      amount: 15000,
      cardCompany: "테스트카드",
      categoryL1: "식비",
    });
    await postTransaction(cookie, {
      date: "2025-08-02",
      merchant: "ANL02_식당B",
      amount: 20000,
      cardCompany: "테스트카드",
      categoryL1: "식비",
    });

    const res = await getDashboard(cookie, "2025-08");
    expect(res.status).toBe(200);
    const body = await res.json() as { categoryBreakdown: Array<{ category: string; amount: number; count: number }> };
    // All transactions in 2025-08 should be category 식비 only (unique dates prevent collision)
    const categories = body.categoryBreakdown.map((c) => c.category);
    expect(categories).toContain("식비");
    // Only one unique L1 category present for this month
    expect(body.categoryBreakdown.length).toBe(1);
  });

  // ANL-03 (ANL-13): sourceType 혼재 → 모두 totalSpend에 포함
  test("ANL-13: sourceType 혼재 → totalSpend에 card/manual 모두 포함", async () => {
    // Insert card-type transaction
    await postTransaction(cookie, {
      date: "2025-08-10",
      merchant: "ANL13_카드결제",
      amount: 30000,
      cardCompany: "신한카드",
      sourceType: "card",
      categoryL1: "식비",
    });
    // Insert manual-type transaction
    await postTransaction(cookie, {
      date: "2025-08-11",
      merchant: "ANL13_수동입력",
      amount: 25000,
      cardCompany: "수동입력",
      sourceType: "manual",
      categoryL1: "식비",
    });

    const res = await getDashboard(cookie, "2025-08");
    expect(res.status).toBe(200);
    const body = await res.json() as { totalSpend: number; totalCount: number };
    // Both card and manual sourceType contribute to totalSpend
    expect(body.totalSpend).toBeGreaterThan(0);
    expect(body.totalCount).toBeGreaterThanOrEqual(2);
  });

  // ANL-04 (ANL-14): pureHouseholdSpend = totalSpend - companyExpenseTotal
  test("ANL-14: pureHouseholdSpend = totalSpend - companyExpenseTotal", async () => {
    // Insert a company expense for a clean month
    await postTransaction(cookie, {
      date: "2025-09-01",
      merchant: "ANL14_법인카드사용",
      amount: 100000,
      cardCompany: "비씨카드",
      isCompanyExpense: true,
      categoryL1: "업무",
    });
    // Insert a personal expense
    await postTransaction(cookie, {
      date: "2025-09-02",
      merchant: "ANL14_개인지출",
      amount: 50000,
      cardCompany: "비씨카드",
      isCompanyExpense: false,
      categoryL1: "식비",
    });

    const res = await getDashboard(cookie, "2025-09");
    expect(res.status).toBe(200);
    const body = await res.json() as {
      totalSpend: number;
      pureHouseholdSpend: number;
      companyExpenseTotal: number;
    };
    // totalSpend = ABS of all amounts = 100000 + 50000 = 150000
    expect(body.totalSpend).toBe(150000);
    expect(body.companyExpenseTotal).toBe(100000);
    expect(body.pureHouseholdSpend).toBe(50000);
    expect(body.pureHouseholdSpend).toBe(body.totalSpend - body.companyExpenseTotal);
  });

  // ANL-05: availableMonths 정렬 (최신 월 우선)
  test("ANL-05: availableMonths 최신 월 우선 정렬", async () => {
    // Both 2025-08 and 2025-09 have transactions from earlier tests
    const res = await getDashboard(cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as { availableMonths: string[] };
    expect(Array.isArray(body.availableMonths)).toBe(true);

    // Verify descending order (newest first)
    for (let i = 1; i < body.availableMonths.length; i++) {
      expect(body.availableMonths[i - 1] >= body.availableMonths[i]).toBe(true);
    }

    // 2025-08 should appear before 2025-09 is NOT expected — 2025-09 is newer
    const idx08 = body.availableMonths.indexOf("2025-08");
    const idx09 = body.availableMonths.indexOf("2025-09");
    if (idx08 !== -1 && idx09 !== -1) {
      // Newer month (2025-09) should have a lower index (appear first)
      expect(idx09).toBeLessThan(idx08);
    }
  });
});
