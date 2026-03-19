import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { profiles } from "../db/schema";
import { createSupabaseClient } from "../lib/supabase";
import type { AppContext } from "../types";

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const db = c.get("db");
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile) {
    return jsonError("Profile not found", 403, "PROFILE_NOT_FOUND");
  }

  if (profile.status === "disabled") {
    return jsonError("Account disabled", 403, "ACCOUNT_DISABLED");
  }

  c.set("user", user);
  c.set("profile", profile);

  await next();
});
