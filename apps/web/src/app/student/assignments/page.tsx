"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { SubmissionStatus } from "@physics-ai-tutor/shared";
import { ArrowRight, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentStatusBadge } from "../_components/assignment-status-badge";
import { hasAnsweredDraft, readAssignmentDraft } from "../_lib/assignment-draft";
import {
  formatDateTime,
  getStudentAssignmentStatus,
  type StudentAssignmentStatus,
} from "../_lib/student-format";
import { fetchJson } from "@/lib/fetcher";

type AssignmentItem = {
  id: string;
  title: string;
  knowledgePoints: string[] | null;
  deadline: string | null;
  submissionStatus: SubmissionStatus | null;
};

type AssignmentListResponse = {
  items: AssignmentItem[];
};

type SubmissionItem = {
  id: string;
  examId: string;
  status: SubmissionStatus;
};

type SubmissionListResponse = {
  items: SubmissionItem[];
};

function AssignmentsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-64 rounded-[24px]" />
      ))}
    </div>
  );
}

function getAction(status: StudentAssignmentStatus, submissionId?: string) {
  if (status === "published" && submissionId) {
    return {
      href: `/student/results/${submissionId}`,
      label: "查看成绩",
    };
  }

  if (status === "in_progress") {
    return {
      href: "",
      label: "继续作答",
    };
  }

  return {
    href: "",
    label: "开始作答",
  };
}

export default function StudentAssignmentsPage() {
  const { data, isLoading } = useSWR<AssignmentListResponse>("/api/exams?pageSize=100", fetchJson);
  const { data: submissionsData } = useSWR<SubmissionListResponse>(
    "/api/submissions?pageSize=100",
    fetchJson
  );
  const [draftFlags, setDraftFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data?.items) {
      return;
    }

    const nextFlags = Object.fromEntries(
      data.items.map((item) => [item.id, hasAnsweredDraft(readAssignmentDraft(item.id))])
    );
    setDraftFlags(nextFlags);
  }, [data]);

  const submissionsByExamId = new Map(
    (submissionsData?.items ?? []).map((item) => [item.examId, item])
  );

  return (
    <PageContainer>
      <PageHeader title="我的作业" description="查看已发布作业、继续作答或进入成绩详情。" />

      {isLoading ? (
        <AssignmentsSkeleton />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(data?.items ?? []).map((assignment) => {
            const submission = submissionsByExamId.get(assignment.id);
            const status = getStudentAssignmentStatus(
              submission?.status ?? assignment.submissionStatus,
              draftFlags[assignment.id] ?? false
            );
            const action = getAction(status, submission?.id);
            const href = action.href || `/student/assignments/${assignment.id}`;

            return (
              <Card key={assignment.id} className="overflow-hidden rounded-[24px]">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft">
                      <ClipboardList className="size-5 text-primary" />
                    </div>
                    <AssignmentStatusBadge status={status} />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl leading-8">{assignment.title}</CardTitle>
                    <p className="text-sm text-text-muted">
                      截止时间：{formatDateTime(assignment.deadline)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {(assignment.knowledgePoints ?? []).map((point) => (
                      <span
                        key={point}
                        className="rounded-full bg-bg-elevated px-3 py-1 text-xs text-text-default"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {action.label}
                    <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
