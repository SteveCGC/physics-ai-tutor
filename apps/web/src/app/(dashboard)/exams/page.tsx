"use client";

import type { ExamStatus } from "@physics-ai-tutor/shared";
import Link from "next/link";
import { Archive, Eye, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  ExamStatusBadge,
  formatRelativeListDate,
  type ExamWithQuestions,
} from "@/components/exams/exam-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type ExamListItem = Omit<ExamWithQuestions, "questions"> & {
  questionCount: number;
  pendingGradeCount: number;
};

type ExamListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ExamListItem[];
};

const tabs: Array<{ value: ExamStatus; label: string }> = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
];

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState<ExamStatus>("draft");
  const [items, setItems] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadExams(status: ExamStatus) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<ExamListResponse>(`/api/exams?status=${status}&pageSize=50`);
      setItems(response.items);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "试卷列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExams(activeTab);
  }, [activeTab]);

  async function changeStatus(examId: string, status: ExamStatus) {
    try {
      await fetchJson(`/api/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadExams(activeTab);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "状态更新失败");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="试卷列表"
        description="按状态查看草稿、已发布和已归档试卷。"
        action={
          <Button asChild>
            <Link href="/exams/new">新建试卷</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-bg-card text-text-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-[16px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tabs.find((tab) => tab.value === activeTab)?.label}试卷</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-text-muted">
              正在加载试卷...
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center text-text-muted">
              当前状态下还没有试卷。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="py-3 pr-4 font-medium">标题</th>
                    <th className="px-4 py-3 font-medium">知识点</th>
                    <th className="px-4 py-3 font-medium">题数</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">创建时间</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((exam) => {
                    const visibleKnowledgePoints = exam.knowledgePoints?.slice(0, 2) ?? [];
                    const hiddenCount = Math.max((exam.knowledgePoints?.length ?? 0) - 2, 0);

                    return (
                      <tr key={exam.id} className="border-b border-border/70 last:border-b-0">
                        <td className="py-4 pr-4 font-medium text-text-strong">{exam.title}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {visibleKnowledgePoints.map((point) => (
                              <Badge key={point} variant="knowledge">
                                {point}
                              </Badge>
                            ))}
                            {hiddenCount > 0 ? <Badge variant="knowledge">+{hiddenCount}</Badge> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-muted">{exam.questionCount}</td>
                        <td className="px-4 py-4">
                          <ExamStatusBadge status={exam.status} />
                        </td>
                        <td className="px-4 py-4 text-text-muted">
                          {formatRelativeListDate(exam.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" asChild>
                              <Link href={`/exams/${exam.id}`}>
                                <Eye className="size-4" />
                                查看
                              </Link>
                            </Button>
                            {exam.status === "draft" ? (
                              <Button
                                size="sm"
                                onClick={() => void changeStatus(exam.id, "published")}
                              >
                                <Send className="size-4" />
                                发布
                              </Button>
                            ) : null}
                            {exam.status === "published" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void changeStatus(exam.id, "archived")}
                              >
                                <Archive className="size-4" />
                                归档
                              </Button>
                            ) : null}
                          </div>
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
    </PageContainer>
  );
}
