"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import type { Answer, Question, Submission } from "@physics-ai-tutor/shared";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { QuestionRenderer } from "@/components/question/question-renderer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "../../_lib/student-format";
import { fetchJson } from "@/lib/fetcher";

type ResultAnswer = Answer & {
  question: Question;
};

type ResultDetail = Submission & {
  exam: {
    title: string;
    totalScore: number | null;
    knowledgePoints: string[] | null;
  };
  answers: ResultAnswer[];
};

function attachmentSrc(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http") || value.startsWith("/api/files/")) {
    return value;
  }

  return `/api/files/student-uploads/${value}`;
}

export default function StudentResultDetailPage() {
  const params = useParams<{ submissionId: string }>();
  const submissionId = params.submissionId;
  const { data, isLoading } = useSWR<ResultDetail>(
    submissionId ? `/api/student/results/${submissionId}` : null,
    fetchJson
  );

  const fullScore = data?.exam.totalScore ?? 0;
  const totalScore = data?.totalScore ?? 0;
  const ratio = fullScore > 0 ? totalScore / fullScore : 0;
  const scoreClass =
    ratio < 0.6
      ? "text-danger"
      : ratio >= 0.8
        ? "text-success"
        : "text-text-strong";

  return (
    <PageContainer>
      {isLoading || !data ? (
        <Skeleton className="h-64 rounded-[24px]" />
      ) : (
        <>
          <PageHeader
            title={data.exam.title}
            description={`提交时间：${formatDateTime(data.submittedAt)}｜发布时间：${formatDateTime(data.publishedAt)}`}
          />

          <Card className="rounded-[28px]">
            <CardContent className="space-y-5 p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-text-muted">Score</p>
              <div className={`text-5xl font-black ${scoreClass}`}>
                {totalScore} / {fullScore}
              </div>
              <div className="flex flex-wrap gap-2">
                {(data.exam.knowledgePoints ?? []).map((point) => (
                  <span
                    key={point}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {data.answers.map((answer, index) => (
              <section key={answer.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-text-strong">第 {index + 1} 题</h2>
                  {(answer.question.knowledgePoints ?? []).map((point) => (
                    <span
                      key={`${answer.id}-${point}`}
                      className="rounded-full bg-bg-elevated px-3 py-1 text-xs text-text-muted"
                    >
                      {point}
                    </span>
                  ))}
                </div>
                <QuestionRenderer
                  question={answer.question}
                  mode="review"
                  value={answer.studentAnswer ?? ""}
                  attachmentUrl={attachmentSrc(answer.attachmentUrl)}
                  reviewData={{
                    isCorrect: answer.isCorrect ?? false,
                    score: answer.score ?? 0,
                    feedback: answer.feedback ?? "",
                    teacherComment: answer.teacherComment ?? "",
                    correctAnswer: answer.question.answer,
                    explanation: [answer.feedback, answer.question.explanation, answer.teacherComment]
                      .filter(Boolean)
                      .join("\n\n"),
                  }}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
