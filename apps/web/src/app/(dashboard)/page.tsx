"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, GraduationCap, Sparkles, Users } from "lucide-react";
import useSWR from "swr";
import { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgePointGroups } from "@/data/knowledge-points";
import { useAuth } from "@/lib/auth";
import { fetchJson } from "@/lib/fetcher";

type TeacherStatsResponse = {
  pendingGradeCount: number;
  weeklyQuestionCount: number;
  publishedExamCount: number;
  studentCount: number;
};

type TeacherExamItem = {
  id: string;
  title: string;
  knowledgePoints: string[] | null;
  status: "draft" | "published" | "archived";
  createdAt: string;
  publishedAt: string | null;
  questionCount: number;
  pendingGradeCount: number;
};

type ExamsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: TeacherExamItem[];
};

function formatDate(value?: string | null) {
  if (!value) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ExamStatusBadge({ status }: { status: TeacherExamItem["status"] }) {
  if (status === "published") {
    return <Badge variant="success">已发布</Badge>;
  }

  if (status === "draft") {
    return (
      <Badge variant="knowledge" className="bg-bg-elevated text-text-muted">
        草稿
      </Badge>
    );
  }

  return (
    <Badge variant="knowledge" className="bg-bg-elevated text-text-muted">
      已归档
    </Badge>
  );
}

function HeroSkeleton() {
  return <Skeleton className="h-44 w-full rounded-[24px]" />;
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-[16px]" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const { profile } = useAuth();
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState(
    knowledgePointGroups[0]?.items[0] ?? ""
  );

  const { data: stats, isLoading: statsLoading } = useSWR<TeacherStatsResponse>(
    "/api/teacher/stats",
    fetchJson
  );
  const { data: examsData, isLoading: examsLoading } = useSWR<ExamsResponse>(
    "/api/exams?pageSize=5",
    fetchJson
  );

  const exams = examsData?.items ?? [];
  const teacherName = profile?.name ?? "老师";

  return (
    <PageContainer>
      <PageHeader
        title="教师仪表盘"
        description="查看今日批改进度、试卷状态与快速出题入口。"
        action={
          <Button asChild>
            <Link href="/exams/new">新建试卷</Link>
          </Button>
        }
      />

      {statsLoading ? (
        <HeroSkeleton />
      ) : (
        <section
          className="flex flex-col gap-6 rounded-[24px] px-6 py-7 text-white shadow-[var(--shadow-md)] lg:flex-row lg:items-center lg:justify-between"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.24em] text-white/75">Teacher Hub</p>
            <h2 className="text-3xl font-bold lg:text-4xl">欢迎回来，{teacherName} 老师！</h2>
            <p className="text-sm text-white/85">
              今日待批改 {stats?.pendingGradeCount ?? 0} 份 | 本周生成{" "}
              {stats?.weeklyQuestionCount ?? 0} 题
            </p>
          </div>
          <Button variant="white" size="lg" asChild>
            <Link href="/exams/new">快速出题</Link>
          </Button>
        </section>
      )}

      {statsLoading ? (
        <KpiSkeleton />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="已发布试卷"
            value={stats?.publishedExamCount ?? 0}
            icon={<FileText className="size-5 text-primary" />}
            accentClassName="text-primary"
          />
          <StatCard
            label="待批改任务"
            value={stats?.pendingGradeCount ?? 0}
            icon={<Sparkles className="size-5 text-warning" />}
            accentClassName="text-warning"
          />
          <StatCard
            label="班级学生数"
            value={stats?.studentCount ?? 0}
            icon={<Users className="size-5 text-primary" />}
            accentClassName="text-primary"
          />
          <StatCard
            label="本周生成题目"
            value={stats?.weeklyQuestionCount ?? 0}
            icon={<GraduationCap className="size-5 text-primary" />}
            accentClassName="text-primary"
          />
        </section>
      )}

      {examsLoading ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl">最近试卷</CardTitle>
            <Button variant="secondary" asChild>
              <Link href="/exams">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-primary-soft">
                  <FileText className="size-9 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-text-strong">还没有试卷，点击开始出题</p>
                  <p className="text-sm text-text-muted">从知识点快速生成一套课堂练习。</p>
                </div>
                <Button asChild>
                  <Link href="/exams/new">AI 出题</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="py-3 pr-4 font-medium">试卷名称</th>
                      <th className="px-4 py-3 font-medium">知识点标签</th>
                      <th className="px-4 py-3 font-medium">题目数</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">发布时间</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => {
                      const visiblePoints = exam.knowledgePoints?.slice(0, 2) ?? [];
                      const hiddenCount = Math.max((exam.knowledgePoints?.length ?? 0) - 2, 0);

                      return (
                        <tr key={exam.id} className="border-b border-border/70 last:border-b-0">
                          <td className="py-4 pr-4 font-medium text-text-strong">{exam.title}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {visiblePoints.map((point) => (
                                <Badge key={point} variant="knowledge">
                                  {point}
                                </Badge>
                              ))}
                              {hiddenCount > 0 ? (
                                <Badge variant="knowledge">+{hiddenCount}</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-text-muted">{exam.questionCount}</td>
                          <td className="px-4 py-4">
                            <ExamStatusBadge status={exam.status} />
                          </td>
                          <td className="px-4 py-4 text-text-muted">
                            {formatDate(exam.publishedAt ?? exam.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            {exam.pendingGradeCount > 0 ? (
                              <Button
                                variant="soft"
                                size="sm"
                                className="bg-warning-soft text-warning hover:opacity-90"
                                asChild
                              >
                                <Link href={`/papers?tab=grading&examId=${exam.id}`}>
                                  去批改
                                </Link>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/exams/${exam.id}`}>查看</Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-transparent bg-primary-soft shadow-[var(--shadow-sm)]">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">快速出题入口</CardTitle>
            <p className="text-sm text-text-muted">按知识点直达出题页面，默认生成 10 题。</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-2">
            <span className="text-sm font-medium text-text-strong">知识点</span>
            <select
              value={selectedKnowledgePoint}
              onChange={(event) => setSelectedKnowledgePoint(event.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-bg-card px-4 text-sm text-text-default shadow-[var(--shadow-sm)] outline-none transition focus:border-[var(--color-primary)]"
            >
              {knowledgePointGroups.map((group) => (
                <optgroup key={group.chapter} label={group.chapter}>
                  {group.items.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Button
            size="lg"
            onClick={() =>
              router.push(
                `/exams/new?knowledgePoint=${encodeURIComponent(
                  selectedKnowledgePoint
                )}&questionCount=10`
              )
            }
          >
            生成 10 题
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
