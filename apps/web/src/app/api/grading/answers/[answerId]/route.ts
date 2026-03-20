import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ answerId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { answerId } = await context.params;
  return proxyRequest(request, `/api/grading/answers/${answerId}`, { method: "PATCH" });
}
