import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api-proxy";

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/api/upload/direct", { method: "POST" });
}
