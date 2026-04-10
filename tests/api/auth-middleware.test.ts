import { describe, test, expect, vi, afterEach } from "vitest";

describe("AUTH-08: missing key in production → 503", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("no UNAHOUSE_ACCESS_KEY_BASE64 + NODE_ENV=production → middleware returns 503", async () => {
    // This test imports the middleware module with mocked env
    vi.stubEnv("UNAHOUSE_ACCESS_KEY_BASE64", "");
    vi.stubEnv("NODE_ENV", "production");

    // Dynamic import to pick up stubbed env
    const { middleware } = await import("../../src/middleware");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3105/", {
      method: "GET",
    });

    const res = await middleware(req);
    expect(res.status).toBe(503);
    // Middleware returns plain text, not JSON
    const body = await res.text();
    expect(body).toBeTruthy();
  });
});
