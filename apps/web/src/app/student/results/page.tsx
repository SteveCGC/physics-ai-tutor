"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "../_lib/student-format";
import { fetchJson } from "@/lib/fetcher";

type ResultItem = {
  submissionId: string;
  examTitle: string;
  totalScore: number | null;
  fullScore: number | null;
  submittedAt: string | null;
  publishedAt: string | null;
};

type ResultListResponse = {
  items: ResultItem[];
};

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-2xl" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function StudentResultsPage() {
  const { data, isLoading } = useSWR<ResultListResponse>(
    "/api/student/results?pageSize=100",
    fetchJson
  );

  return (
    <PageContainer>
      <PageHeader title="成绩查看" description="仅展示已发布的成绩记录，可进入详情查看逐题反馈。" />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>成绩列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[760px] overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-[2.2fr_1fr_1.4fr_1.4fr_120px] gap-4 bg-bg-elevated px-4 py-3 text-sm font-semibold text-text-strong">
                  <span>试卷名</span>
                  <span>得分/满分</span>
                  <span>提交时间</span>
                  <span>发布时间</span>
                  <span>操作</span>
                </div>
                {(data?.items ?? []).length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-text-muted">暂无已发布成绩</div>
                ) : (
                  (data?.items ?? []).map((item) => (
                    <div
                      key={item.submissionId}
                      className="grid grid-cols-[2.2fr_1fr_1.4fr_1.4fr_120px] gap-4 border-t border-border px-4 py-4 text-sm text-text-default"
                    >
                      <span className="font-medium text-text-strong">{item.examTitle}</span>
                      <span>
                        {item.totalScore ?? 0}/{item.fullScore ?? 0}
                      </span>
                      <span>{formatDateTime(item.submittedAt)}</span>
                      <span>{formatDateTime(item.publishedAt)}</span>
                      <Link
                        href={`/student/results/${item.submissionId}`}
                        className="font-medium text-primary"
                      >
                        查看详情
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
