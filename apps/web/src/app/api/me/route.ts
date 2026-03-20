import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import { getSupabaseCookieName, readSessionFromCookieString } from "@/lib/auth-session";

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  const cookieName = getSupabaseCookieName(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const session = readSessionFromCookieString(
    request.headers.get("cookie") ?? "",
    cookieName
  );

  return session?.access_token ?? null;
}

export async function GET(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${getApiBaseUrl()}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
