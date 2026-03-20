"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getMyProfile, signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const session = await signIn(email, password);
      const profile = await getMyProfile(session.access_token);

      toast.success("登录成功", "正在进入你的工作区");
      router.push(profile?.role === "student" ? "/student" : "/");
    } catch (error) {
      toast.error("登录失败", error instanceof Error ? error.message : "请检查邮箱和密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell title="欢迎回来" subtitle="继续你的备课、出题与班级管理工作。">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Field label="邮箱" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            leadingIcon={<Mail />}
            placeholder="teacher@school.edu.cn"
            required
          />
        </Field>
        <Field label="密码" htmlFor="password">
          <Input
            id="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            leadingIcon={<Lock />}
            trailingAdornment={
              <button
                type="button"
                className="rounded-full p-1 transition-colors hover:bg-primary-soft hover:text-primary"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "隐藏密码" : "显示密码"}
              >
                {visible ? <EyeOff /> : <Eye />}
              </button>
            }
            placeholder="请输入密码"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "登录中..." : "登录"}
        </Button>
      </form>
      <p className="text-sm text-text-muted">
        没有账号？
        <Link href="/register" className="ml-2 font-medium text-primary transition-colors hover:text-primary-hover">
          注册
        </Link>
      </p>
    </AuthSplitShell>
  );
}
