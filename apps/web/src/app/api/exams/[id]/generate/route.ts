import { NextRequest } from "next/server";
import { proxyEventStream } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyEventStream(request, `/api/exams/${id}/generate`);
}
