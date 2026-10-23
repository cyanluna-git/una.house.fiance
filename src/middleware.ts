import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_KEY_ENV_NAME } from "@/lib/access-auth";

const SHORTCUT_PATH = "/api/quick-entry/shortcut";
const SHORTCUT_TOKEN_ENV_NAME = "UNAHOUSE_SHORTCUT_TOKEN";

const PUBLIC_PATHS = [
  "/unlock",
  "/api/auth/unlock",
  "/api/auth/logout",
  "/manifest.webmanifest",
  "/sw.js",
];

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    PUBLIC_PATHS.some((path) => pathname === path)
  );
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 아이폰 단축어 전용: 이 한 경로에 한해 Bearer 토큰으로 인증한다 (쿠키 불필요).
  // 토큰은 거래 입력(shortcut) 엔드포인트에서만 유효하다.
  if (pathname === SHORTCUT_PATH && request.method === "POST") {
    const shortcutToken = process.env[SHORTCUT_TOKEN_ENV_NAME]?.trim() ?? "";
    const auth = request.headers.get("authorization") ?? "";
    if (shortcutToken && auth === `Bearer ${shortcutToken}`) {
      return NextResponse.next();
    }
  }

  const configuredKey = process.env[ACCESS_KEY_ENV_NAME]?.trim() ?? "";

  if (!configuredKey) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return new NextResponse("Access key is not configured", { status: 503 });
  }

  const expectedHash = await sha256Hex(configuredKey);
  const providedHash = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (providedHash === expectedHash) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // next start -H 127.0.0.1 뒤(nginx 프록시)에서는 request.nextUrl의 host가 localhost:3104가 된다.
  // 브라우저가 보낸 Host / X-Forwarded-* 헤더로 공개 주소를 만들어야 리다이렉트가 깨지지 않는다.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const unlockUrl = new URL(`${proto}://${host}/unlock`);
  unlockUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
