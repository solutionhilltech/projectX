import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/api/auth/login"]);

export function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
