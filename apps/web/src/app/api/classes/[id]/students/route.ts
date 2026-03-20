import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const search = request.nextUrl.search;
  return proxyGet(request, `/api/classes/${id}/students${search}`);
}
