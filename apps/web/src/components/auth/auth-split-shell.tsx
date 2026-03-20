import { Atom, BrainCircuit, Sparkles } from "lucide-react";
import { MathText } from "@/components/ui/katex-renderer";

const highlights = [
  "AI 按知识点快速生成题组与整卷",
  "教师端统一管理班级、试卷与学生表现",
  "学生端实时查看作业、成绩与批注反馈",
];

export function AuthSplitShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page px-4 py-10 md:px-8">
      <div className="grid w-full max-w-[1200px] overflow-hidden rounded-[28px] border border-border bg-bg-card shadow-lg lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-primary px-12 py-14 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_38%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                <Atom className="size-4" />
                Physics AI Tutor
              </div>
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-white/70">
                  Smart Teaching Workspace
                </p>
                <h1 className="max-w-md text-5xl font-bold leading-tight">
                  高中物理教学，从备课到反馈一体化完成。
                </h1>
                <p className="max-w-lg text-base leading-7 text-white/80">
                  围绕试卷生成、班级管理和学习反馈打造，给教师和学生同一条清晰的学习链路。
                </p>
              </div>
            </div>
            <div className="relative mt-10 space-y-8">
              <div className="grid gap-4">
                <div className="rounded-[20px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <MathText
                    text="$$F=ma$$"
                    className="text-2xl font-medium text-white"
                  />
                  <p className="mt-3 text-sm text-white/75">
                    从牛顿运动定律到电磁感应，支持带公式的题目与解析展示。
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <MathText
                    text="$E_k=\\frac{1}{2}mv^2$ · $W=Fs\\cos\\theta$"
                    className="text-lg text-white"
                  />
                </div>
              </div>
              <ul className="space-y-4">
                {highlights.map((item, index) => {
                  const Icon = [Sparkles, BrainCircuit, Atom][index] ?? Sparkles;
                  return (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/85">
                      <span className="mt-0.5 rounded-full border border-white/20 bg-white/10 p-2">
                        <Icon className="size-4" />
                      </span>
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
        <section className="flex min-h-[720px] items-center justify-center bg-bg-card px-6 py-12 sm:px-10">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
                Physics AI Tutor
              </p>
              <h2 className="text-3xl font-bold text-text-strong">{title}</h2>
              <p className="text-sm leading-6 text-text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
