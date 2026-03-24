import { Atom, BrainCircuit, Sparkles, Zap } from "lucide-react";
import { MathText } from "@/components/ui/katex-renderer";

const features = [
  { icon: Sparkles, label: "AI 智能出题", desc: "按知识点一键生成整卷" },
  { icon: BrainCircuit, label: "班级全链路", desc: "管理试卷、学生与反馈" },
  { icon: Zap, label: "实时批注", desc: "学生即时查看成绩与解析" },
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
    <main className="flex h-dvh items-center justify-center bg-bg-page px-4 py-6 md:px-8">
      <div className="grid w-full max-w-[1200px] max-h-[calc(100dvh-3rem)] overflow-hidden rounded-[28px] border border-border bg-bg-card shadow-lg lg:grid-cols-2">

        {/* ── 左侧品牌面板 ── */}
        <section className="relative hidden select-none overflow-hidden bg-gradient-primary text-white lg:flex lg:flex-col">
          {/* 背景装饰 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-10 bottom-32 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
            {/* 网格纹理 */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative flex h-full flex-col justify-between px-10 py-9">
            {/* 顶部 */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                <Atom className="size-3.5" />
                Physics AI Tutor
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Smart Teaching Workspace
                </p>
                <h1 className="text-4xl font-bold leading-snug">
                  高中物理教学
                  <br />
                  <span className="text-white/90">从备课到反馈</span>
                  <br />
                  一体化完成。
                </h1>
              </div>
            </div>

            {/* 中间：公式展示卡 */}
            <div className="my-6 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                <span className="text-xs text-white/60">公式渲染示例</span>
              </div>
              <MathText
                text="$$F = ma \qquad E_k = \frac{1}{2}mv^2$$"
                className="text-xl font-medium text-white"
              />
              <div className="mt-3 border-t border-white/10 pt-3">
                <MathText
                  text="$$W = Fs\cos\theta \qquad \varepsilon = -\frac{\Delta\Phi}{\Delta t}$$"
                  className="text-base text-white/85"
                />
              </div>
            </div>

            {/* 底部：功能特性 */}
            <div className="grid grid-cols-3 gap-3">
              {features.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/8 p-3.5 backdrop-blur-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-3.5" />
                  </span>
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-xs leading-snug text-white/65">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 右侧表单区 ── */}
        <section className="flex overflow-y-auto items-center justify-center bg-bg-card px-6 py-10 sm:px-10">
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
