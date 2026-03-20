import { NextRequest } from "next/server";
import { proxyGet, proxyRequest } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search;
  return proxyGet(request, `/api/exams${query}`);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/api/exams", { method: "POST" });
}
