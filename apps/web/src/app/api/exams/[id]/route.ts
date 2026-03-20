import { NextRequest } from "next/server";
import { proxyGet, proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyGet(request, `/api/exams/${id}`);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyRequest(request, `/api/exams/${id}`, { method: "PATCH" });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyRequest(request, `/api/exams/${id}`, { method: "DELETE" });
}
