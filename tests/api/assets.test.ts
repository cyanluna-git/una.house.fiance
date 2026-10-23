/**
 * ASSET-01~07: 자산 계좌 + 스냅샷 CRUD
 * Server runs on port 3105 via globalSetup (vitest-server-setup.ts).
 */
import { describe, test, expect, beforeAll } from "vitest";
import { getAuthCookie } from "../fixtures/auth";

const BASE = "http://localhost:3105";
let cookie = "";

const call = (path: string, init: RequestInit = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...(init.headers || {}) },
  });

beforeAll(async () => {
  cookie = await getAuthCookie(BASE);
});

describe("assets", () => {
  let accountId = 0;

  test("ASSET-01 인증 없으면 401", async () => {
    const res = await fetch(`${BASE}/api/assets`);
    expect(res.status).toBe(401);
  });

  test("ASSET-02 필수값 누락/잘못된 종류는 400", async () => {
    expect((await call("/api/assets", { method: "POST", body: JSON.stringify({ name: "x" }) })).status).toBe(400);
    expect(
      (await call("/api/assets", { method: "POST", body: JSON.stringify({ assetType: "없는종류", name: "x" }) })).status
    ).toBe(400);
  });

  test("ASSET-03 계좌 생성", async () => {
    const res = await call("/api/assets", {
      method: "POST",
      body: JSON.stringify({ assetType: "청약", name: "ASSET테스트청약", institution: "하나은행", monthlyDeposit: 100000, depositDay: 28 }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    accountId = json.id;
  });

  test("ASSET-04 스냅샷 추가 + 같은 날짜 중복은 409", async () => {
    const body = { accountId, snapshotDate: "2026-10-23", balance: 4700000, principal: 4700000 };
    expect((await call("/api/assets/snapshots", { method: "POST", body: JSON.stringify(body) })).status).toBe(200);
    expect((await call("/api/assets/snapshots", { method: "POST", body: JSON.stringify(body) })).status).toBe(409);
  });

  test("ASSET-05 스냅샷 검증(날짜 형식, 음수, 없는 계좌)", async () => {
    const bad = (b: object) => call("/api/assets/snapshots", { method: "POST", body: JSON.stringify(b) });
    expect((await bad({ accountId, snapshotDate: "2026/10/24", balance: 1 })).status).toBe(400);
    expect((await bad({ accountId, snapshotDate: "2026-10-24", balance: -5 })).status).toBe(400);
    expect((await bad({ accountId: 999999, snapshotDate: "2026-10-24", balance: 1 })).status).toBe(404);
  });

  test("ASSET-06 목록은 최신 스냅샷 포함", async () => {
    await call("/api/assets/snapshots", { method: "POST", body: JSON.stringify({ accountId, snapshotDate: "2026-11-23", balance: 4800000 }) });
    const json = await (await call("/api/assets")).json();
    const mine = json.data.find((a: { id: number }) => a.id === accountId);
    expect(mine.latest.snapshotDate).toBe("2026-11-23");
    expect(mine.latest.balance).toBe(4800000);
    expect(mine.snapshots.length).toBe(2);
  });

  test("ASSET-07 삭제는 스냅샷까지 지움", async () => {
    expect((await call(`/api/assets/${accountId}`, { method: "DELETE" })).status).toBe(200);
    const json = await (await call("/api/assets")).json();
    expect(json.data.find((a: { id: number }) => a.id === accountId)).toBeUndefined();
    expect((await call(`/api/assets/${accountId}`, { method: "DELETE" })).status).toBe(404);
  });
});
