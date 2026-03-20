"use client";

import { useEffect, useState } from "react";
import {
  clearPersistedSession,
  getRoleFromSession,
  getStoredSession,
  persistSession,
  type AuthSession,
  type UserProfile,
  type UserRole,
} from "@/lib/auth-session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const AUTH_EVENT = "physics-ai-tutor:auth-change";

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("缺少 Supabase 环境变量");
  }
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function normalizeSession(payload: Record<string, unknown>): AuthSession | null {
  const accessToken = payload.access_token;
  const user = payload.user;

  if (!accessToken || typeof accessToken !== "string" || !user || typeof user !== "object") {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token:
      typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
    expires_at: typeof payload.expires_at === "number" ? payload.expires_at : undefined,
    expires_in: typeof payload.expires_in === "number" ? payload.expires_in : undefined,
    token_type: typeof payload.token_type === "string" ? payload.token_type : "bearer",
    user: user as AuthSession["user"],
  };
}

async function authRequest(path: string, init: RequestInit) {
  ensureEnv();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    throw new Error(
      (typeof payload?.msg === "string" && payload.msg) ||
        (typeof payload?.error_description === "string" && payload.error_description) ||
        (typeof payload?.error === "string" && payload.error) ||
        "认证失败"
    );
  }

  return payload ?? {};
}

export async function signUp(
  email: string,
  password: string,
  metadata: { role: UserRole; name: string; school?: string }
) {
  const payload = await authRequest("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: metadata,
    }),
  });

  const session = normalizeSession(payload);
  if (session) {
    persistSession(session, SUPABASE_URL);
    emitAuthChange();
  }

  return { session, user: payload.user as AuthSession["user"] | undefined };
}

export async function signIn(email: string, password: string) {
  const payload = await authRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const session = normalizeSession(payload);
  if (!session) {
    throw new Error("登录成功但未拿到会话");
  }

  persistSession(session, SUPABASE_URL);
  emitAuthChange();
  return session;
}

type AppRouterLike = {
  push: (href: string) => void;
};

export async function signOut(router?: AppRouterLike) {
  const session = getSession();

  if (session?.access_token) {
    try {
      await authRequest("/auth/v1/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch {
      // 登出失败时仍清理本地会话
    }
  }

  clearPersistedSession(SUPABASE_URL);
  emitAuthChange();

  if (router) {
    router.push("/login");
  } else if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function getSession() {
  return getStoredSession(SUPABASE_URL);
}

export async function getMyProfile(token?: string): Promise<UserProfile | null> {
  const accessToken = token ?? getSession()?.access_token;
  if (!accessToken) {
    return null;
  }

  const response = await fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as UserProfile;
}

export function useAuth() {
  const [user, setUser] = useState<AuthSession["user"] | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      const session = getSession();

      if (!active) {
        return;
      }

      setUser(session?.user ?? null);

      if (!session?.access_token) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const nextProfile = await getMyProfile(session.access_token);
      if (!active) {
        return;
      }

      setProfile(nextProfile);
      setIsLoading(false);
    };

    load();

    const handleAuthChange = () => {
      void load();
    };

    window.addEventListener(AUTH_EVENT, handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, []);

  const role = profile?.role ?? getRoleFromSession(getSession());

  return {
    user,
    profile,
    isLoading,
    isTeacher: role === "teacher",
    isStudent: role === "student",
  };
}
