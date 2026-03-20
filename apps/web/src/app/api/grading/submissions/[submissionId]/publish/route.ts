import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { submissionId } = await context.params;
  return proxyRequest(request, `/api/grading/submissions/${submissionId}/publish`, {
    method: "POST",
  });
}
