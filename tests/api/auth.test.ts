import { describe, test, expect } from "vitest";
import crypto from "crypto";

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

describe("AUTH: middleware access control", () => {
  describe("AUTH-01: unauthenticated page redirect", () => {
    test("GET / without cookie → 307 to /unlock", async () => {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      expect(res.status).toBe(307);
      const loc = res.headers.get("location") ?? "";
      expect(loc).toContain("/unlock");
      expect(loc).toContain("next=");
    });

    test("GET /transactions?from=2026-01 → Location encodes next param", async () => {
      const res = await fetch(`${BASE}/transactions?from=2026-01`, { redirect: "manual" });
      expect(res.status).toBe(307);
      const loc = res.headers.get("location") ?? "";
      expect(loc).toContain("/unlock");
    });

    test("tampered cookie → 307", async () => {
      const res = await fetch(`${BASE}/`, {
        redirect: "manual",
        headers: { Cookie: "unahouse_auth=tampered-garbage" },
      });
      expect(res.status).toBe(307);
    });
  });

  describe("AUTH-02: unauthenticated API → 401 JSON", () => {
    test("GET /api/transactions without cookie → 401 JSON", async () => {
      const res = await fetch(`${BASE}/api/transactions`, { redirect: "manual" });
      expect(res.status).toBe(401);
      const ct = res.headers.get("content-type") ?? "";
      expect(ct).toContain("application/json");
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    test("tampered cookie on API → 401", async () => {
      const res = await fetch(`${BASE}/api/transactions`, {
        redirect: "manual",
        headers: { Cookie: "unahouse_auth=tampered" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("AUTH-03: public paths accessible without cookie", () => {
    test("GET /unlock → not blocked", async () => {
      const res = await fetch(`${BASE}/unlock`, { redirect: "manual" });
      expect(res.status).not.toBe(401);
    });

    test("POST /api/auth/unlock → not blocked by middleware", async () => {
      const res = await fetch(`${BASE}/api/auth/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: TEST_KEY }),
        redirect: "manual",
      });
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    test("POST /api/auth/logout → not blocked", async () => {
      const res = await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        redirect: "manual",
      });
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  });

  describe("AUTH-04: correct key sets auth cookie", () => {
    test("valid key → 200, Set-Cookie with hash, body ok:true", async () => {
      const res = await fetch(`${BASE}/api/auth/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: TEST_KEY }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      // Code returns { ok: true } not { success: true }
      expect(body.ok).toBe(true);

      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain("unahouse_auth=");

      // Verify cookie value is SHA-256 hash of the key
      const expectedHash = crypto.createHash("sha256").update(TEST_KEY).digest("hex");
      expect(setCookie).toContain(`unahouse_auth=${expectedHash}`);
    });
  });

  describe("AUTH-05: wrong key → 401", () => {
    test("invalid key → 401", async () => {
      const res = await fetch(`${BASE}/api/auth/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "wrong-key-totally-invalid" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("AUTH-06: authenticated request succeeds", () => {
    test("valid cookie → 200 on GET /", async () => {
      const cookie = await getAuthCookie();
      expect(cookie).toBeTruthy();
      const res = await fetch(`${BASE}/`, {
        redirect: "manual",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("AUTH-07: logout clears cookie", () => {
    test("logout sets Max-Age=0, subsequent GET / → 307", async () => {
      const cookie = await getAuthCookie();

      const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const setCookie = logoutRes.headers.get("set-cookie") ?? "";
      expect(setCookie.toLowerCase()).toContain("max-age=0");

      // Without cookie, should redirect
      const afterRes = await fetch(`${BASE}/`, { redirect: "manual" });
      expect(afterRes.status).toBe(307);
    });
  });

  describe("AUTH-09: static assets bypass middleware", () => {
    test("/_next/static path not blocked by middleware", async () => {
      const res = await fetch(`${BASE}/_next/static/chunks/main.js`, {
        redirect: "manual",
      });
      // Should be 200 or 404, NOT 307 or 401
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  });
});
