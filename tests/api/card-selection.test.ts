import { beforeAll, expect, test } from "vitest";

const BASE = "http://localhost:3105";
let cookie = "";
let activeId: number;
let inactiveId: number;
const company = "[CARD-TEST]";
const stamp = Date.now();
async function request(path: string, method = "GET", body?: unknown) {
  return fetch(`${BASE}${path}`, {
    method, headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const entry = (suffix: string) => ({
  date: "2097-01-11", merchant: `[CARD-TEST]${stamp}-${suffix}`, amount: 7654,
  cardCompany: company, categoryL1: "기타", force: true,
});
async function commit(data: object) {
  const res = await request("/api/quick-entry/commit", "POST", { entries: [data] });
  expect(res.status).toBe(200);
  return res.json();
}
async function transaction(id: number) {
  const res = await request("/api/transactions?from=2097-01-11&to=2097-01-11&limit=200");
  return (await res.json()).data.find((t: { id: number }) => t.id === id);
}
beforeAll(async () => {
  const login = await request("/api/auth/unlock", "POST", { key: "test-key-base64" });
  cookie = login.headers.get("set-cookie")?.match(/unahouse_auth=[^;]+/)?.[0] ?? "";
  for (const isActive of [true, false]) {
    const res = await request("/api/cards", "POST", { cardCompany: company, cardName: isActive ? "Active" : "Inactive", isActive, annualFee: 1 });
    const data = await res.json();
    expect(res.ok).toBe(true);
    if (isActive) activeId = data.id;
    else inactiveId = data.id;
  }
});

test("legacy issuer-only quick entries never guess a registered card", async () => {
  const data = await commit(entry("legacy"));
  expect(data.savedCount).toBe(1);
  expect((await transaction(data.savedIds[0])).cardId).toBeNull();
});

test("explicit active card is canonicalized through commit without stripping id/name", async () => {
  const data = await commit({ ...entry("active"), cardId: activeId, cardCompany: "wrong", cardName: "wrong" });
  expect(data.savedCount).toBe(1);
  expect(await transaction(data.savedIds[0])).toMatchObject({ cardId: activeId, cardCompany: company, cardName: "Active" });
});

test("quick commit cleanly skips invalid or inactive explicit cards", async () => {
  for (const cardId of [inactiveId, 999999, "1junk", 0, -1, 1.5]) {
    const data = await commit({ ...entry(`invalid-${cardId}`), cardId });
    expect(data.savedCount).toBe(0);
    expect(data.skipped[0].reason).toMatch(/카드/);
  }
});

test("edit rejects invalid/inactive cards and preserves an existing inactive link", async () => {
  const data = await commit({ ...entry("edit"), cardId: activeId });
  const id = data.savedIds[0];
  for (const cardId of [inactiveId, 999999, "1junk", 0, -1, 1.5, ""]) {
    expect((await request(`/api/transactions/${id}`, "PATCH", { cardId })).status).toBe(400);
  }
  expect((await transaction(id)).cardId).toBe(activeId);
  await request(`/api/cards/${activeId}`, "PUT", { isActive: false });
  const retained = await request(`/api/transactions/${id}`, "PATCH", { note: "unrelated edit", cardId: activeId });
  expect(retained.status).toBe(200);
  expect(await transaction(id)).toMatchObject({ cardId: activeId, note: "unrelated edit" });
  await request(`/api/cards/${activeId}`, "PUT", { isActive: true });
  expect((await request(`/api/transactions/${id}`, "PATCH", { cardId: null, cardCompany: "현금", cardName: "현금" })).status).toBe(200);
  expect(await transaction(id)).toMatchObject({ cardId: null, cardCompany: "현금", cardName: "현금" });
});
