"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchJson } from "@/lib/fetcher";

type StudentAssignment = {
  id: string;
  title: string;
  deadline: string | null;
  submissionStatus: "in_progress" | "submitted" | "pending_review" | "published" | null;
};

type StudentExamsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: StudentAssignment[];
};

type StudentResult = {
  submissionId: string;
  examTitle: string;
  totalScore: number | null;
  fullScore: number | null;
  publishedAt: string | null;
};

type StudentResultsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: StudentResult[];
};

function formatDeadline(value?: string | null) {
  if (!value) {
    return "未设置截止时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AssignmentStatusBadge({
  status,
}: {
  status: StudentAssignment["submissionStatus"];
}) {
  if (status === "published") {
    return <Badge variant="success">已发布成绩</Badge>;
  }

  if (status === "in_progress") {
    return <Badge variant="warning">进行中</Badge>;
  }

  if (status === "submitted" || status === "pending_review") {
    return <Badge variant="info">已提交</Badge>;
  }

  return (
    <Badge variant="knowledge" className="bg-bg-elevated text-text-muted">
      未开始
    </Badge>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function StudentHomePage() {
  const { profile } = useAuth();
  const { data: assignmentsData, isLoading: assignmentsLoading } = useSWR<StudentExamsResponse>(
    "/api/exams?pageSize=5",
    fetchJson
  );
  const { data: resultsData, isLoading: resultsLoading } = useSWR<StudentResultsResponse>(
    "/api/student/results?pageSize=3",
    fetchJson
  );

  const studentName = profile?.name ?? "同学";
  const assignments = assignmentsData?.items ?? [];
  const results = resultsData?.items ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="学生首页"
        description="查看待完成作业、最新成绩和老师发布的课堂任务。"
      />

      <section
        className="rounded-[24px] px-6 py-7 text-white shadow-[var(--shadow-md)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-white/75">Student Space</p>
          <h2 className="text-3xl font-bold lg:text-4xl">{studentName} 同学，加油！</h2>
          <p className="text-sm text-white/85">按时完成作业，成绩会在这里第一时间更新。</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {assignmentsLoading ? (
          <ListSkeleton rows={5} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">待完成作业</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="py-12 text-center text-sm text-text-muted">暂无待完成作业</div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={
                        assignment.submissionStatus === "published"
                          ? "/student/results"
                          : `/student/assignments/${assignment.id}`
                      }
                      className="flex items-center justify-between rounded-2xl border border-border bg-bg-elevated px-4 py-4 transition hover:border-[var(--color-primary)]"
                    >
                      <div className="min-w-0 space-y-2">
                        <p className="truncate font-medium text-text-strong">{assignment.title}</p>
                        <p className="text-sm text-text-muted">
                          截止时间：{formatDeadline(assignment.deadline)}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <AssignmentStatusBadge status={assignment.submissionStatus} />
                        <ArrowRight className="size-4 text-text-subtle" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {resultsLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">最近成绩</CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="py-12 text-center text-sm text-text-muted">暂无已发布成绩</div>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.submissionId}
                      className="rounded-2xl border border-border bg-bg-card p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="font-medium text-text-strong">{result.examTitle}</p>
                          <p className="text-sm text-text-muted">
                            发布时间：{formatDeadline(result.publishedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2">
                          <Trophy className="size-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            {result.totalScore ?? 0}/{result.fullScore ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="border-transparent bg-primary-soft shadow-[var(--shadow-sm)]">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-bg-card">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text-strong">继续整理错题与课堂练习</p>
              <p className="text-sm text-text-muted">按发布时间回看最近试卷和成绩变化。</p>
            </div>
          </div>
          <Link href="/student/results" className="text-sm font-medium text-primary">
            查看全部成绩
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
