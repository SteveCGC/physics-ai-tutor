import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getRoleFromSession,
  getSupabaseCookieName,
  readSessionFromCookieString,
} from "./src/lib/auth-session";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PUBLIC_PREFIXES = ["/_next", "/favicon.ico", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const cookieName = getSupabaseCookieName(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const session = readSessionFromCookieString(
    request.headers.get("cookie") ?? "",
    cookieName
  );
  const role = getRoleFromSession(session);

  if (!session?.access_token) {
    if (AUTH_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(
      new URL(role === "student" ? "/student" : "/", request.url)
    );
  }

  if (role === "teacher" && pathname.startsWith("/student")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (role === "student" && !pathname.startsWith("/student")) {
    return NextResponse.redirect(new URL("/student", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
