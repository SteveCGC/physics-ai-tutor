"use client";

import type { ExamStatus } from "@physics-ai-tutor/shared";
import Link from "next/link";
import { Archive, Eye, Send, Sparkles, Plus } from "lucide-react";
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

const emptyConfig: Record<ExamStatus, { title: string; desc: string; showCreate: boolean }> = {
  draft: {
    title: "还没有草稿试卷",
    desc: "点击「AI 出题」，让 AI 根据知识点和难度要求自动生成一套完整试卷。",
    showCreate: true,
  },
  published: {
    title: "还没有已发布的试卷",
    desc: "在草稿中生成试卷并审核通过后，点击「发布」即可在这里看到。",
    showCreate: false,
  },
  archived: {
    title: "还没有已归档的试卷",
    desc: "将不再使用的已发布试卷归档，方便管理历史记录。",
    showCreate: false,
  },
};

function EmptyState({ tab }: { tab: ExamStatus }) {
  const config = emptyConfig[tab];
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-6 py-12">
      {/* Illustration */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Document shadow */}
        <rect x="28" y="22" width="68" height="82" rx="8" fill="#E9D5FF" opacity="0.5"/>
        {/* Document body */}
        <rect x="24" y="18" width="68" height="82" rx="8" fill="white" stroke="#DDD6FE" strokeWidth="1.5"/>
        {/* Lines */}
        <rect x="36" y="34" width="44" height="4" rx="2" fill="#EDE9FE"/>
        <rect x="36" y="44" width="36" height="4" rx="2" fill="#EDE9FE"/>
        <rect x="36" y="58" width="44" height="3" rx="1.5" fill="#F3F0FF"/>
        <rect x="36" y="66" width="30" height="3" rx="1.5" fill="#F3F0FF"/>
        <rect x="36" y="74" width="38" height="3" rx="1.5" fill="#F3F0FF"/>
        <rect x="36" y="82" width="22" height="3" rx="1.5" fill="#F3F0FF"/>
        {/* AI badge */}
        <circle cx="88" cy="30" r="16" fill="#7C3AED"/>
        <text x="88" y="35" textAnchor="middle" fontFamily="Arial Black, Arial" fontSize="11" fontWeight="900" fill="white">AI</text>
        {/* Sparkle top-right */}
        <path d="M102 12 L103.5 16 L107.5 17.5 L103.5 19 L102 23 L100.5 19 L96.5 17.5 L100.5 16 Z" fill="#A78BFA" opacity="0.7"/>
        {/* Plus circle bottom */}
        <circle cx="60" cy="108" r="10" fill="#7C3AED" opacity="0.12"/>
        <line x1="60" y1="104" x2="60" y2="112" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
        <line x1="56" y1="108" x2="64" y2="108" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
      </svg>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-base font-semibold text-text-strong">{config.title}</p>
        <p className="max-w-xs text-sm text-text-muted">{config.desc}</p>
      </div>

      {config.showCreate && (
        <Button asChild>
          <Link href="/exams/new">
            <Plus className="size-4" />
            AI 出题
          </Link>
        </Button>
      )}
    </div>
  );
}

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
            <Link href="/exams/new">
              <Sparkles className="size-4" />
              AI 出题
            </Link>
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
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-text-muted">
                <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                <span className="text-sm">正在加载试卷...</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <EmptyState tab={activeTab} />
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
