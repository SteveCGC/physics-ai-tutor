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
  let profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const role = meta.role === "student" ? "student" : "teacher";
    const name = typeof meta.name === "string" && meta.name.trim()
      ? meta.name.trim()
      : (user.email?.split("@")[0] ?? "用户");
    const school = typeof meta.school === "string" && meta.school.trim()
      ? meta.school.trim()
      : undefined;

    const [created] = await db
      .insert(profiles)
      .values({ id: user.id, role, name, school, status: "active" })
      .returning();

    if (!created) {
      return jsonError("Failed to create profile", 500, "PROFILE_CREATE_FAILED");
    }

    profile = created;
  }

  if (profile.status === "disabled") {
    return jsonError("Account disabled", 403, "ACCOUNT_DISABLED");
  }

  c.set("user", user);
  c.set("profile", profile);

  await next();
});
