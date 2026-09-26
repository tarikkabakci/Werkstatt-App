import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "./lib/firebase-admin";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/login" ||
    path === "/api/auth/login" ||
    path === "/api/auth/logout" ||
    path.startsWith("/_next/") ||
    path === "/favicon.svg" ||
    path === "/werkstatt-logo.png"
  ) return NextResponse.next();

  const supplied = request.cookies.get("werkstatt_session")?.value;
  if (supplied) {
    try {
      await adminAuth.verifySessionCookie(supplied, true);
      return NextResponse.next();
    } catch {}
  }
  if (path.startsWith("/api/"))
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
