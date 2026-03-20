import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyRequest(request, `/api/questions/${id}`, { method: "PATCH" });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyRequest(request, `/api/questions/${id}`, { method: "DELETE" });
}
