import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_KEY_ENV_NAME, getAccessKey } from "@/lib/access-auth";

function hashAccessKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const configuredKey = getAccessKey();

  if (!configuredKey) {
    return NextResponse.json(
      { error: `${ACCESS_KEY_ENV_NAME} is not configured` },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { key?: string } | null;
  const submittedKey = body?.key?.trim() ?? "";

  if (!submittedKey) {
    return NextResponse.json({ error: "Access key is required" }, { status: 400 });
  }

  if (submittedKey !== configuredKey) {
    return NextResponse.json({ error: "Invalid access key" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: hashAccessKey(configuredKey),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
