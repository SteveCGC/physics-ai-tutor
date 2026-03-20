"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import type { Answer, Question, Submission, SubmissionStatus } from "@physics-ai-tutor/shared";
import { PageContainer } from "@/components/layout/page-container";
import { QuestionRenderer } from "@/components/question/question-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  clearAssignmentDraft,
  hasAnsweredDraft,
  readAssignmentDraft,
  writeAssignmentDraft,
} from "../../_lib/assignment-draft";
import { formatCountdown, formatDateTime } from "../../_lib/student-format";
import { FetchError, fetchJson } from "@/lib/fetcher";

type StudentQuestion = Pick<
  Question,
  "id" | "type" | "content" | "options" | "score" | "knowledgePoints" | "orderIndex"
>;

type ExamDetail = {
  id: string;
  title: string;
  deadline: string | null;
  totalScore: number | null;
  questions: StudentQuestion[];
};

type SubmissionListResponse = {
  items: Array<{
    id: string;
    examId: string;
    status: SubmissionStatus;
  }>;
};

type SubmissionAnswer = Answer & {
  question: StudentQuestion & Partial<Pick<Question, "answer" | "explanation">>;
};

type SubmissionDetail = Submission & {
  exam: {
    id: string;
    title: string;
    deadline: string | null;
    totalScore: number | null;
  };
  answers: SubmissionAnswer[];
};

type AnswerState = {
  value: string;
  attachmentUrl?: string | null;
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

function isAnswered(answer?: AnswerState) {
  return Boolean(answer?.value.trim() || answer?.attachmentUrl);
}

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [forcedSubmissionId, setForcedSubmissionId] = useState<string | null>(null);
  const [deadlineTick, setDeadlineTick] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoSubmitStartedRef = useRef(false);

  const { data: exam, isLoading: examLoading } = useSWR<ExamDetail>(
    examId ? `/api/exams/${examId}` : null,
    fetchJson
  );
  const { data: submissionList } = useSWR<SubmissionListResponse>(
    examId ? `/api/submissions?examId=${examId}&pageSize=1` : null,
    fetchJson
  );

  const submissionId = forcedSubmissionId ?? submissionList?.items?.[0]?.id ?? null;
  const submissionStatus = submissionList?.items?.[0]?.status ?? null;
  const { data: submissionDetail, mutate: mutateSubmissionDetail } = useSWR<SubmissionDetail>(
    submissionId ? `/api/submissions/${submissionId}` : null,
    fetchJson
  );

  useEffect(() => {
    if (!exam?.questions || submissionId) {
      return;
    }

    const draft = readAssignmentDraft(exam.id);
    const nextAnswers = Object.fromEntries(
      exam.questions.map((question) => [
        question.id,
        {
          value: draft?.answers[question.id]?.value ?? "",
          attachmentUrl: draft?.answers[question.id]?.attachmentUrl ?? null,
        },
      ])
    );
    setAnswers(nextAnswers);
  }, [exam, submissionId]);

  useEffect(() => {
    if (!examId || !exam?.questions || submissionId) {
      return;
    }

    const draft = {
      examId,
      updatedAt: new Date().toISOString(),
      answers,
    };

    if (hasAnsweredDraft(draft)) {
      writeAssignmentDraft(draft);
      return;
    }

    clearAssignmentDraft(examId);
  }, [answers, exam?.questions, examId, submissionId]);

  useEffect(() => {
    if (!exam?.deadline || submissionId) {
      return;
    }

    const timer = window.setInterval(() => {
      setDeadlineTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exam?.deadline, submissionId]);

  const questionCount = exam?.questions.length ?? 0;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((item) => isAnswered(item)).length,
    [answers]
  );
  const unansweredCount = Math.max(questionCount - answeredCount, 0);
  const deadlinePassed = Boolean(
    exam?.deadline && new Date(exam.deadline).getTime() <= deadlineTick
  );
  const currentQuestion = exam?.questions[currentIndex] ?? null;

  useEffect(() => {
    if (!exam || !deadlinePassed || submissionId || autoSubmitStartedRef.current || !exam.questions.length) {
      return;
    }

    autoSubmitStartedRef.current = true;
    void handleSubmit(true);
  }, [deadlinePassed, exam, submissionId]);

  async function handleAttachmentUpload(questionId: string, file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["png", "jpg", "jpeg"].includes(extension)) {
      setUploadErrors((current) => ({ ...current, [questionId]: "仅支持 png/jpg/jpeg 格式" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors((current) => ({ ...current, [questionId]: "文件大小不能超过 5MB" }));
      return;
    }

    setUploadingQuestionId(questionId);
    setUploadErrors((current) => ({ ...current, [questionId]: null }));

    try {
      const formData = new FormData();
      formData.set("bucket", "student-uploads");
      formData.set("file", file);

      const response = await fetchJson<{ fileKey: string }>("/api/upload/direct", {
        method: "POST",
        body: formData,
      });

      setAnswers((current) => ({
        ...current,
        [questionId]: {
          ...(current[questionId] ?? { value: "" }),
          attachmentUrl: response.fileKey,
        },
      }));
    } catch (error) {
      setUploadErrors((current) => ({
        ...current,
        [questionId]: error instanceof Error ? error.message : "图片上传失败",
      }));
    } finally {
      setUploadingQuestionId(null);
    }
  }

  async function handleSubmit(isAutoSubmit = false) {
    if (!exam || submitPending) {
      return;
    }

    setSubmitPending(true);
    setSubmitError(null);

    try {
      await fetchJson<{ results: Array<{ questionId: string }> }>("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: exam.id,
          answers: exam.questions.map((question) => ({
            questionId: question.id,
            studentAnswer: answers[question.id]?.value ?? "",
            attachmentUrl: answers[question.id]?.attachmentUrl ?? undefined,
          })),
        }),
      });

      clearAssignmentDraft(exam.id);
      const refreshedList = await fetchJson<SubmissionListResponse>(
        `/api/submissions?examId=${exam.id}&pageSize=1`
      );
      const nextSubmissionId = refreshedList.items[0]?.id ?? null;
      if (nextSubmissionId) {
        setForcedSubmissionId(nextSubmissionId);
      }
      setSubmitOpen(false);
      await mutateSubmissionDetail();
    } catch (error) {
      if (error instanceof FetchError && error.status === 400 && !isAutoSubmit) {
        setSubmitError(error.message);
      } else {
        setSubmitError(error instanceof Error ? error.message : "提交失败");
      }

      if (isAutoSubmit) {
        autoSubmitStartedRef.current = false;
      }
    } finally {
      setSubmitPending(false);
    }
  }

  useEffect(() => {
    if (submissionStatus === "published" && submissionId) {
      router.replace(`/student/results/${submissionId}`);
    }
  }, [router, submissionId, submissionStatus]);

  if (examLoading || !exam) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-8 text-sm text-text-muted">正在加载试卷...</CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (submissionId && !submissionDetail) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-8 text-sm text-text-muted">正在加载提交结果...</CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (deadlinePassed && !submissionId) {
    return (
      <PageContainer>
        <Card className="rounded-[24px] border-warning bg-warning-soft">
          <CardContent className="space-y-3 p-8">
            <p className="text-xl font-semibold text-text-strong">作答入口已关闭</p>
            <p className="text-sm text-text-default">
              本试卷已于 {formatDateTime(exam.deadline)} 截止，截止后不允许继续进入答题页。
            </p>
            <Button variant="secondary" onClick={() => router.push("/student/assignments")}>
              返回作业列表
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const reviewAnswers = submissionDetail?.answers ?? [];
  const inReviewMode = reviewAnswers.length > 0;

  return (
    <PageContainer className="pb-32 pt-4">
      <div className="sticky top-0 z-30 -mx-8 border-b border-border bg-[color:color-mix(in_srgb,var(--color-bg-card)_88%,white)] px-8 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-text-strong">{exam.title}</h1>
            <p className="text-sm text-text-muted">
              已答 {inReviewMode ? submissionDetail?.answers.length ?? 0 : answeredCount}/{questionCount} 题
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exam.deadline ? (
              <div className="rounded-2xl bg-bg-elevated px-4 py-2 text-sm font-semibold text-text-strong">
                截止倒计时 {formatCountdown(exam.deadline)}
              </div>
            ) : null}
            <div className="rounded-2xl bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
              共 {questionCount} 题
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_160px]">
        <div className="space-y-5">
          {submitError ? (
            <Card className="border-danger bg-danger-soft">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-danger">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{submitError}</span>
              </CardContent>
            </Card>
          ) : null}

          {inReviewMode ? (
            reviewAnswers.map((answer, index) => {
              const isSubjective =
                answer.question.type === "calculation" || answer.question.type === "short_answer";
              const pendingManualReview = isSubjective && answer.score === null;

              return (
                <section
                  key={answer.id}
                  id={`question-${index + 1}`}
                  className={index === currentIndex ? "scroll-mt-28" : "hidden"}
                >
                  <div className="mb-3 text-lg font-semibold text-text-strong">第 {index + 1} 题</div>
                  {pendingManualReview ? (
                    <div className="mb-4 rounded-2xl border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
                      已提交，等待老师批改
                    </div>
                  ) : null}
                  <QuestionRenderer
                    question={answer.question}
                    mode="review"
                    value={answer.studentAnswer ?? ""}
                    attachmentUrl={attachmentSrc(answer.attachmentUrl)}
                    reviewData={{
                      isCorrect: answer.isCorrect ?? false,
                      score: answer.score ?? undefined,
                      feedback: answer.feedback ?? "",
                      teacherComment: answer.teacherComment ?? "",
                      correctAnswer: answer.question.answer ?? "",
                      explanation: answer.question.explanation ?? "",
                    }}
                  />
                </section>
              );
            })
          ) : currentQuestion ? (
            <section id={`question-${currentIndex + 1}`} className="scroll-mt-28">
              <div className="mb-3 text-lg font-semibold text-text-strong">
                第 {currentIndex + 1} 题
              </div>
              <QuestionRenderer
                question={currentQuestion}
                mode="answer"
                value={answers[currentQuestion.id]?.value ?? ""}
                attachmentUrl={attachmentSrc(answers[currentQuestion.id]?.attachmentUrl)}
                uploadPending={uploadingQuestionId === currentQuestion.id}
                uploadError={uploadErrors[currentQuestion.id]}
                onValueChange={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: {
                      ...(current[currentQuestion.id] ?? { value: "", attachmentUrl: null }),
                      value,
                    },
                  }))
                }
                onAttachmentSelect={(file) => handleAttachmentUpload(currentQuestion.id, file)}
              />
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-2 lg:grid-cols-3">
                {(inReviewMode ? reviewAnswers : exam.questions).map((item, index) => {
                  const questionId = "question" in item ? item.question.id : item.id;
                  const answered = inReviewMode ? true : isAnswered(answers[questionId]);
                  const isCurrent = currentIndex === index;

                  return (
                    <button
                      key={questionId}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={[
                        "aspect-square rounded-xl text-sm font-semibold transition",
                        isCurrent
                          ? "bg-primary text-white"
                          : answered
                            ? "bg-primary-soft text-primary"
                            : "bg-border text-text-muted",
                      ].join(" ")}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-[color:color-mix(in_srgb,var(--color-bg-card)_92%,white)] px-4 py-4 backdrop-blur lg:left-[88px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="size-4" />
              上一题
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex((value) => Math.min(value + 1, questionCount - 1))}
              disabled={currentIndex >= questionCount - 1}
            >
              下一题
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {inReviewMode ? (
            <Button variant="primary" onClick={() => router.push("/student/assignments")}>
              返回作业列表
            </Button>
          ) : (
            <Dialog.Root open={submitOpen} onOpenChange={setSubmitOpen}>
              <Dialog.Trigger asChild>
                <Button>提交试卷</Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-border bg-bg-card p-6 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Dialog.Title className="text-2xl font-semibold text-text-strong">
                        确认提交试卷
                      </Dialog.Title>
                      <Dialog.Description className="text-sm leading-6 text-text-muted">
                        还有 {unansweredCount} 题未作答，允许部分提交。提交后将无法修改答案。
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="rounded-xl border border-border p-2 text-text-subtle transition hover:text-text-strong"
                        aria-label="关闭"
                      >
                        <X className="size-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <Button variant="secondary">取消</Button>
                    </Dialog.Close>
                    <Button onClick={() => void handleSubmit()} disabled={submitPending}>
                      {submitPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      确认提交
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
