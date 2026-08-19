import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createSessionToken, verifyCredentials, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password || !(await verifyCredentials(username, password))) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  return Response.json({ ok: true });
}
