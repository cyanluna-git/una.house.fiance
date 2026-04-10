import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_KEY_ENV_NAME } from "@/lib/access-auth";

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

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
