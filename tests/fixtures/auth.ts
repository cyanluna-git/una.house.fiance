export async function getAuthCookie(baseURL: string): Promise<string> {
  const key = process.env.UNAHOUSE_ACCESS_KEY_BASE64 || "test-key-base64";
  const res = await fetch(`${baseURL}/api/auth/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/unahouse_auth=[^;]+/);
  return match ? match[0] : "";
}
