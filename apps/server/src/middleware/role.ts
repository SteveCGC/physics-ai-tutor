import { createMiddleware } from "hono/factory";

import { profileRoles, type Profile } from "../db/schema";
import type { AppContext, Variables } from "../types";

export type Role = (typeof profileRoles)[number];
export type AuthenticatedProfile = Variables["profile"];

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppContext>(async (c, next) => {
    const profile = c.get("profile") as Profile;

    if (!roles.includes(profile.role as Role)) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    await next();
  });
}
