"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/lib/auth";
import { persistSession } from "@/lib/auth-session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const errorParam = params.get("error");
    const errorDesc = params.get("error_description");

    if (errorParam) {
      setError(errorDesc ?? errorParam);
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = params.get("expires_in");
    const expiresAt = params.get("expires_at");

    if (!accessToken) {
      setError("无效的验证链接，请重新注册或联系管理员。");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("获取用户信息失败，链接可能已过期。");
        }

        const user = await response.json() as Record<string, unknown>;

        persistSession(
          {
            access_token: accessToken,
            refresh_token: refreshToken ?? undefined,
            expires_in: expiresIn ? Number(expiresIn) : undefined,
            expires_at: expiresAt ? Number(expiresAt) : undefined,
            token_type: "bearer",
            user: user as Parameters<typeof persistSession>[0]["user"],
          },
          SUPABASE_URL
        );

        const profile = await getMyProfile(accessToken);
        router.replace(profile?.role === "student" ? "/student" : "/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "验证失败，请重试。");
      }
    };

    void verify();
  }, [router]);

  if (error) {
    return (
      <main className="flex h-dvh items-center justify-center bg-bg-page px-4">
        <div className="flex max-w-sm flex-col items-center gap-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <XCircle className="size-7" />
          </span>
          <div className="space-y-1.5">
            <p className="font-semibold text-text-strong">验证失败</p>
            <p className="text-sm text-text-muted">{error}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/register")}>
            重新注册
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh items-center justify-center bg-bg-page px-4">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CheckCircle className="size-7" />
        </span>
        <div className="space-y-1.5">
          <p className="font-semibold text-text-strong">邮箱验证成功</p>
          <p className="text-sm text-text-muted">正在跳转到你的工作区…</p>
        </div>
      </div>
    </main>
  );
}
