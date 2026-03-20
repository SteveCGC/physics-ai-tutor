"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getMyProfile, signIn, signUp } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-session";

const roleOptions = [
  {
    value: "teacher" as const,
    label: "教师",
    description: "创建试卷、管理班级、查看学生学情",
    icon: ShieldCheck,
  },
  {
    value: "student" as const,
    label: "学生",
    description: "完成作业、查看成绩与老师反馈",
    icon: GraduationCap,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const passwordError = useMemo(() => {
    if (!password) {
      return undefined;
    }

    return password.length < 6 ? "密码至少 6 位" : undefined;
  }, [password]);

  const schoolError =
    attemptedSubmit && role === "teacher" && !school.trim() ? "教师必须填写学校" : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (password.length < 6) {
      toast.error("注册失败", "密码至少需要 6 位");
      return;
    }

    if (role === "teacher" && !school.trim()) {
      toast.error("注册失败", "教师必须填写学校");
      return;
    }

    setSubmitting(true);

    try {
      const result = await signUp(email, password, {
        role,
        name,
        school: school || undefined,
      });

      if (!result.session) {
        await signIn(email, password);
      }

      const profile = await getMyProfile();
      toast.success("注册成功", "已为你创建账户并自动登录");
      router.push(profile?.role === "student" ? "/student" : "/");
    } catch (error) {
      toast.error("注册失败", error instanceof Error ? error.message : "请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitShell title="创建账号" subtitle="选择你的身份后，开始进入物理教学工作台。">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Field label="选择角色">
          <div className="grid gap-3 sm:grid-cols-2">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const active = role === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "rounded-[18px] border p-4 text-left transition-all",
                    active
                      ? "border-[var(--color-primary)] bg-primary-soft shadow-sm"
                      : "border-border bg-bg-card hover:border-[var(--color-primary)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-2xl p-3",
                        active ? "bg-[var(--color-primary)] text-white" : "bg-bg-elevated text-primary"
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-text-strong">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-text-muted">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="姓名" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入真实姓名"
            required
          />
        </Field>

        <Field label="邮箱" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.edu.cn"
            required
          />
        </Field>

        <Field label="密码" htmlFor="password" hint="至少 6 位">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="设置登录密码"
            error={passwordError}
            required
          />
        </Field>

        <Field
          label="学校"
          htmlFor="school"
          hint={role === "teacher" ? "教师必填" : "学生可选"}
        >
          <Input
            id="school"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="例如：杭州市第二中学"
            error={schoolError}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "注册中..." : "注册并进入系统"}
        </Button>
      </form>
      <p className="text-sm text-text-muted">
        已有账号？
        <Link href="/login" className="ml-2 font-medium text-primary transition-colors hover:text-primary-hover">
          立即登录
        </Link>
      </p>
    </AuthSplitShell>
  );
}
