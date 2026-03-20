import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search;
  return proxyGet(request, `/api/student/results${query}`);
}
