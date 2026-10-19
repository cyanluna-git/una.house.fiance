/**
 * QE-01~: 빠른 입력 API 테스트 (parse / commit / receipt 및 수동 입력 409)
 *
 * vitest-server-setup이 next dev를 3105에 띄운다. 이 파일은 그 서버에 요청한다.
 * 테스트 행은 모두 merchant에 "[QE-TEST]"를 붙여 다른 테스트와 섞이지 않게 한다.
 * 영수증 분석(receipt)은 실제 AI 서버가 필요하므로 여기서는 인증/형식 오류만 검증한다.
 */
import { describe, test, expect, beforeAll } from "vitest";

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

function post(path: string, cookie: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

let cookie = "";
beforeAll(async () => {
  cookie = await getAuthCookie();
});

describe("QE: 인증", () => {
  test("QE-01 무인증 parse는 401", async () => {
    const res = await fetch(`${BASE}/api/quick-entry/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x", useAi: false }),
    });
    expect(res.status).toBe(401);
  });

  test("QE-02 무인증 receipt는 401", async () => {
    const fd = new FormData();
    fd.append("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), "a.jpg");
    const res = await fetch(`${BASE}/api/quick-entry/receipt`, { method: "POST", body: fd });
    expect(res.status).toBe(401);
  });
});

describe("QE: parse", () => {
  test("QE-03 카드 문자 1건을 파싱하고 중복 판정 필드를 돌려준다", async () => {
    const res = await post("/api/quick-entry/parse", cookie, {
      text: "[Web발신]\n현대카드 승인 1,234원 10/17 12:34 [QE-TEST]파싱\n",
      useAi: false,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries.length).toBe(1);
    const e = data.entries[0];
    expect(e.amount).toBe(1234);
    expect(e.cardCompany).toBe("현대카드");
    expect(e.duplicate.level).toBe("none");
  });

  test("QE-04 빈 텍스트는 400", async () => {
    const res = await post("/api/quick-entry/parse", cookie, { text: "   ", useAi: false });
    expect(res.status).toBe(400);
  });
});

describe("QE: commit", () => {
  const uniq = `[QE-TEST]commit-${Date.now()}`;
  const entry = {
    date: "2026-03-03",
    merchant: uniq,
    amount: 4321,
    cardCompany: "현대카드",
    categoryL1: "기타",
    categoryL2: "미분류",
    necessity: "unset",
  };

  test("QE-05 정상 저장 후 같은 건은 중복으로 건너뛴다", async () => {
    const first = await post("/api/quick-entry/commit", cookie, { sourceType: "sms", entries: [entry] });
    expect(first.status).toBe(200);
    const a = await first.json();
    expect(a.savedCount).toBe(1);

    const second = await post("/api/quick-entry/commit", cookie, { sourceType: "sms", entries: [entry] });
    const b = await second.json();
    expect(b.savedCount).toBe(0);
    expect(b.skipped[0].reason).toMatch(/중복/);
  });

  test("QE-06 영수증 검증 불일치는 금액 확인 없이 저장되지 않는다", async () => {
    const res = await post("/api/quick-entry/commit", cookie, {
      sourceType: "receipt",
      entries: [{ ...entry, merchant: `${uniq}-rcpt`, receiptCheck: "mismatch" }],
    });
    const data = await res.json();
    expect(data.savedCount).toBe(0);
    expect(data.skipped[0].reason).toMatch(/검증 불일치/);
  });

  test("QE-07 영수증 불일치라도 금액 확인(amountConfirmed)이 있으면 저장된다", async () => {
    const res = await post("/api/quick-entry/commit", cookie, {
      sourceType: "receipt",
      // QE-05에서 저장한 건과 날짜·금액이 같으면 가맹점 유사도로 '중복 의심'이 되므로 금액·날짜를 달리한다
      entries: [{ ...entry, date: "2026-03-05", amount: 98765, merchant: `${uniq}-ok`, receiptCheck: "mismatch", amountConfirmed: true }],
    });
    const data = await res.json();
    expect(data.skipped).toEqual([]);
    expect(data.savedCount).toBe(1);
  });
});

describe("수동 입력 중복 → 409", () => {
  test("QE-08 같은 거래를 두 번 넣으면 두 번째는 409", async () => {
    const body = {
      date: "2026-04-04",
      merchant: `[QE-TEST]manual-${Date.now()}`,
      amount: 2222,
      cardCompany: "현금",
      categoryL1: "기타",
      categoryL2: "미분류",
    };
    const first = await post("/api/transactions", cookie, body);
    expect(first.status).toBe(200);
    const second = await post("/api/transactions", cookie, body);
    expect(second.status).toBe(409);
  });
});
