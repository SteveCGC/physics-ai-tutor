import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyRequest(request, `/api/exams/${id}/questions`, { method: "POST" });
}
