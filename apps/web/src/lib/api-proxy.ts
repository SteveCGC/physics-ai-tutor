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

export async function proxyGet(request: NextRequest, path: string) {
  return proxyRequest(request, path, { method: "GET" });
}

export async function proxyRequest(
  request: NextRequest,
  path: string,
  init?: RequestInit
) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestBody =
    init?.body ??
    (request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text().catch(() => undefined));

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: init?.method ?? request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(requestBody
        ? { "Content-Type": request.headers.get("content-type") ?? "application/json" }
        : {}),
      ...(init?.headers ?? {}),
    },
    body: requestBody,
    cache: "no-store",
  });

  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function proxyEventStream(request: NextRequest, path: string) {
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestBody = await request.text().catch(() => "");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body: requestBody,
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": response.headers.get("Cache-Control") ?? "no-cache, no-transform",
      Connection: response.headers.get("Connection") ?? "keep-alive",
    },
  });
}
