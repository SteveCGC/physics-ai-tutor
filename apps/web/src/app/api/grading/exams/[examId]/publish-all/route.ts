import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ examId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { examId } = await context.params;
  return proxyRequest(request, `/api/grading/exams/${examId}/publish-all`, {
    method: "POST",
  });
}
