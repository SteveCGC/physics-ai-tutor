"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Answer, Question, Submission } from "@physics-ai-tutor/shared";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  formatDateTime,
  inputClassName,
  questionTypeLabels,
  textareaClassName,
  type TeacherClass,
} from "@/components/exams/exam-shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/ui/katex-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type ExamDetail = {
  id: string;
  title: string;
  classId: string;
  questions: Question[];
};

type ClassStudent = {
  id: string;
  name: string;
  avatar?: string | null;
};

type SubmissionListResponse = {
  items: Array<
    Pick<
      Submission,
      "id" | "examId" | "studentId" | "status" | "totalScore" | "submittedAt" | "publishedAt"
    >
  >;
};

type SubmissionAnswer = Answer & {
  question: Question;
};

type SubmissionDetail = Submission & {
  exam: {
    id: string;
    title: string;
    totalScore: number | null;
  };
  answers: SubmissionAnswer[];
};

type GradeDraft = {
  scoreInput: string;
  teacherComment: string;
};

type PublishMode = "individual" | "all";
type GradingTab = "question" | "student";
type MainView = "grading" | "overview";

const QUICK_COMMENTS = [
  "解题思路正确，但计算有误",
  "物理量单位错误",
  "公式运用正确，步骤完整",
  "缺少受力分析过程",
  "结果正确，但解题过程不规范",
];

function isSubjectiveQuestion(question: Pick<Question, "type">) {
  return question.type === "calculation" || question.type === "short_answer";
}

function attachmentSrc(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http") || value.startsWith("/api/files/")) {
    return value;
  }

  return `/api/files/student-uploads/${value}`;
}

function getInitials(name?: string | null) {
  if (!name) {
    return "学生";
  }

  return name.trim().slice(0, 2);
}

function clampScore(value: number, maxScore: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), maxScore);
}

function isWithinRevisionWindow(publishedAt?: string | null) {
  if (!publishedAt) {
    return false;
  }

  return Date.now() - new Date(publishedAt).getTime() <= 24 * 60 * 60 * 1000;
}

function buildDraftMap(submissions: SubmissionDetail[]) {
  const entries: Array<[string, GradeDraft]> = [];

  submissions.forEach((submission) => {
    submission.answers.forEach((answer) => {
      entries.push([
        answer.id,
        {
          scoreInput: answer.score == null ? "" : String(answer.score),
          teacherComment: answer.teacherComment ?? "",
        },
      ]);
    });
  });

  return Object.fromEntries(entries) as Record<string, GradeDraft>;
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm text-text-muted">
        <span>批改进度</span>
        <span>
          已批改主观题 {value} / 总主观题 {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_64%,white))] transition-all"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ExamGradingPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [className, setClassName] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const [tab, setTab] = useState<GradingTab>("question");
  const [mainView, setMainView] = useState<MainView>("grading");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<PublishMode>("all");
  const [publishPending, setPublishPending] = useState(false);
  const [selectedPublishIds, setSelectedPublishIds] = useState<string[]>([]);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseReason, setReviseReason] = useState("");
  const [revisePending, setRevisePending] = useState(false);
  const [reviseAnswerId, setReviseAnswerId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string | null>>({});
  const saveTimersRef = useRef<Record<string, number>>({});
  const draftsRef = useRef<Record<string, GradeDraft>>({});
  const submissionsRef = useRef<SubmissionDetail[]>([]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      setLoading(true);
      setError(null);

      try {
        const examData = await fetchJson<ExamDetail>(`/api/exams/${examId}`);
        const [classes, studentItems, submissionList] = await Promise.all([
          fetchJson<TeacherClass[]>("/api/classes"),
          fetchJson<ClassStudent[]>(`/api/classes/${examData.classId}/students?pageSize=100`),
          fetchJson<SubmissionListResponse>(`/api/submissions?examId=${examId}&pageSize=100`),
        ]);
        const submissionDetails = await Promise.all(
          submissionList.items.map((item) =>
            fetchJson<SubmissionDetail>(`/api/submissions/${item.id}`)
          )
        );

        if (!active) {
          return;
        }

        const sortedQuestions = [...examData.questions].sort((a, b) => a.orderIndex - b.orderIndex);
        const sortedSubmissions = [...submissionDetails].sort((a, b) => {
          return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
        });
        const subjectiveQuestions = sortedQuestions.filter(isSubjectiveQuestion);

        setExam({ ...examData, questions: sortedQuestions });
        setClassName(classes.find((item) => item.id === examData.classId)?.name ?? "");
        setStudents(studentItems);
        setSubmissions(sortedSubmissions);
        setDrafts(buildDraftMap(sortedSubmissions));
        setSelectedQuestionId((current) => current ?? subjectiveQuestions[0]?.id ?? null);
        setSelectedStudentId((current) => current ?? studentItems[0]?.id ?? null);
        setSelectedPublishIds(
          sortedSubmissions.filter((item) => item.status !== "published").map((item) => item.id)
        );
        if (sortedSubmissions.length > 0 && sortedSubmissions.every((item) => item.status === "published")) {
          setMainView("overview");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "批改中心加载失败");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      active = false;
    };
  }, [examId]);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const questions = exam?.questions ?? [];
  const subjectiveQuestions = useMemo(
    () => questions.filter(isSubjectiveQuestion),
    [questions]
  );

  const currentQuestion =
    subjectiveQuestions.find((question) => question.id === selectedQuestionId) ??
    subjectiveQuestions[0] ??
    null;

  const currentStudent =
    students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;

  const submittedCount = submissions.length;
  const totalStudents = students.length;

  const totalSubjectiveAnswers = subjectiveQuestions.length * submittedCount;
  const gradedSubjectiveAnswers = useMemo(() => {
    return submissions.reduce((total, submission) => {
      return (
        total +
        submission.answers.filter(
          (answer) => isSubjectiveQuestion(answer.question) && answer.gradedBy === "teacher"
        ).length
      );
    }, 0);
  }, [submissions]);

  const questionAnswerMap = useMemo(() => {
    const map = new Map<string, Array<{ submission: SubmissionDetail; answer: SubmissionAnswer }>>();

    submissions.forEach((submission) => {
      submission.answers.forEach((answer) => {
        const bucket = map.get(answer.questionId) ?? [];
        bucket.push({ submission, answer });
        map.set(answer.questionId, bucket);
      });
    });

    return map;
  }, [submissions]);

  const currentQuestionAnswers = currentQuestion ? questionAnswerMap.get(currentQuestion.id) ?? [] : [];

  const unpublishedSubmissions = submissions.filter((submission) => submission.status !== "published");
  const pendingStudentsCount = submissions.filter((submission) =>
    submission.answers.some(
      (answer) => isSubjectiveQuestion(answer.question) && answer.gradedBy == null
    )
  ).length;
  const allGradingFinished = submittedCount > 0 && pendingStudentsCount === 0;
  const allPublished = submittedCount > 0 && submissions.every((submission) => submission.status === "published");

  const overviewStats = useMemo(() => {
    const published = submissions.filter((submission) => submission.status === "published");
    const scores = published.map((submission) => submission.totalScore ?? 0);
    const average =
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;

    const questionRates = subjectiveQuestions.map((question) => {
      const attempts = published
        .map((submission) => submission.answers.find((answer) => answer.questionId === question.id))
        .filter((answer): answer is SubmissionAnswer => Boolean(answer));
      const totalScore = attempts.reduce((sum, answer) => sum + (answer.score ?? 0), 0);
      const fullScore = attempts.length * question.score;
      const ratio = fullScore > 0 ? Math.round((totalScore / fullScore) * 100) : 0;

      return {
        question,
        ratio,
        averageScore:
          attempts.length > 0 ? Math.round((totalScore / attempts.length) * 10) / 10 : 0,
      };
    });

    return {
      average,
      highest,
      lowest,
      questionRates,
    };
  }, [submissions, subjectiveQuestions]);

  function updateLocalAnswer(
    answerId: string,
    updater: (answer: SubmissionAnswer, submission: SubmissionDetail) => SubmissionAnswer
  ) {
    setSubmissions((current) =>
      current.map((submission) => ({
        ...submission,
        answers: submission.answers.map((answer) =>
          answer.id === answerId ? updater(answer, submission) : answer
        ),
      }))
    );
  }

  function scheduleSave(answerId: string) {
    const timer = saveTimersRef.current[answerId];
    if (timer) {
      window.clearTimeout(timer);
    }

    saveTimersRef.current[answerId] = window.setTimeout(() => {
      void saveDraft(answerId);
    }, 500);
  }

  async function saveDraft(answerId: string) {
    const draft = draftsRef.current[answerId];
    const target = submissionsRef.current
      .flatMap((submission) => submission.answers.map((answer) => ({ submission, answer })))
      .find((item) => item.answer.id === answerId);

    if (!draft || !target || target.submission.status === "published") {
      return;
    }

    const rawScore = draft.scoreInput.trim();
    if (rawScore === "") {
      return;
    }

    const nextScore = clampScore(Number(rawScore), target.answer.question.score);
    const payload = {
      score: nextScore,
      teacherComment: draft.teacherComment.trim() || undefined,
    };

    setSavingIds((current) => ({ ...current, [answerId]: true }));
    setSaveErrors((current) => ({ ...current, [answerId]: null }));

    try {
      const updatedAnswer = await fetchJson<Answer>(`/api/grading/answers/${answerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      updateLocalAnswer(answerId, (answer) => ({
        ...answer,
        ...updatedAnswer,
      }));
      setDrafts((current) => ({
        ...current,
        [answerId]: {
          scoreInput: String(updatedAnswer.score ?? nextScore),
          teacherComment: updatedAnswer.teacherComment ?? "",
        },
      }));
    } catch (saveError) {
      setSaveErrors((current) => ({
        ...current,
        [answerId]: saveError instanceof Error ? saveError.message : "保存失败",
      }));
    } finally {
      setSavingIds((current) => ({ ...current, [answerId]: false }));
    }
  }

  function handleDraftChange(
    answer: SubmissionAnswer,
    field: keyof GradeDraft,
    value: string
  ) {
    setDrafts((current) => ({
      ...current,
      [answer.id]: {
        scoreInput: current[answer.id]?.scoreInput ?? (answer.score == null ? "" : String(answer.score)),
        teacherComment: current[answer.id]?.teacherComment ?? answer.teacherComment ?? "",
        [field]: value,
      },
    }));

    if (field === "teacherComment") {
      updateLocalAnswer(answer.id, (currentAnswer) => ({
        ...currentAnswer,
        teacherComment: value,
      }));
      scheduleSave(answer.id);
      return;
    }

    if (value.trim() === "" || Number.isNaN(Number(value))) {
      return;
    }

    const nextScore = clampScore(Number(value), answer.question.score);
    updateLocalAnswer(answer.id, (currentAnswer) => ({
      ...currentAnswer,
      score: nextScore,
      gradedBy: "teacher",
      gradedAt: currentAnswer.gradedAt ?? new Date().toISOString(),
    }));
    scheduleSave(answer.id);
  }

  function appendQuickComment(answer: SubmissionAnswer, comment: string) {
    const currentComment = drafts[answer.id]?.teacherComment ?? answer.teacherComment ?? "";
    const nextComment = currentComment.trim() ? `${currentComment}\n${comment}` : comment;
    handleDraftChange(answer, "teacherComment", nextComment);
  }

  async function publishScores() {
    const targetIds =
      publishMode === "all"
        ? unpublishedSubmissions.map((submission) => submission.id)
        : selectedPublishIds;

    if (targetIds.length === 0) {
      toast.error("没有可发布的成绩");
      return;
    }

    setPublishPending(true);

    try {
      if (publishMode === "all") {
        const result = await fetchJson<{ published: number; skipped: number }>(
          `/api/grading/exams/${examId}/publish-all`,
          {
            method: "POST",
          }
        );

        if (result.published > 0) {
          setSubmissions((current) =>
            current.map((submission) =>
              submission.status === "published"
                ? submission
                : {
                    ...submission,
                    status: "published",
                    publishedAt: new Date().toISOString(),
                    totalScore: submission.answers.reduce((sum, answer) => sum + (answer.score ?? 0), 0),
                  }
            )
          );
        }

        toast.success(`已成功发布 ${result.published} 份成绩`);
      } else {
        const results = await Promise.all(
          targetIds.map((submissionId) =>
            fetchJson<{ totalScore: number; publishedAt: string }>(
              `/api/grading/submissions/${submissionId}/publish`,
              { method: "POST" }
            ).then((result) => ({ submissionId, ...result }))
          )
        );

        setSubmissions((current) =>
          current.map((submission) => {
            const published = results.find((item) => item.submissionId === submission.id);
            if (!published) {
              return submission;
            }

            return {
              ...submission,
              status: "published",
              publishedAt: published.publishedAt,
              totalScore: published.totalScore,
            };
          })
        );
        toast.success(`已成功发布 ${results.length} 份成绩`);
      }

      setPublishOpen(false);
      setMainView("overview");
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "成绩发布失败");
    } finally {
      setPublishPending(false);
    }
  }

  const reviseTarget = useMemo(() => {
    if (!reviseAnswerId) {
      return null;
    }

    return submissions
      .flatMap((submission) =>
        submission.answers.map((answer) => ({
          submission,
          answer,
        }))
      )
      .find((item) => item.answer.id === reviseAnswerId);
  }, [reviseAnswerId, submissions]);

  async function submitRevision() {
    if (!reviseTarget) {
      return;
    }

    const draft = drafts[reviseTarget.answer.id];
    const rawScore = draft?.scoreInput.trim() ?? "";
    if (rawScore === "") {
      toast.error("请填写修改后的分数");
      return;
    }

    if (!reviseReason.trim()) {
      toast.error("请填写修改原因");
      return;
    }

    setRevisePending(true);

    try {
      const updatedAnswer = await fetchJson<Answer & { totalScore?: number }>(
        `/api/grading/answers/${reviseTarget.answer.id}/revise`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: clampScore(Number(rawScore), reviseTarget.answer.question.score),
            teacherComment: draft?.teacherComment.trim() || undefined,
            reason: reviseReason.trim(),
          }),
        }
      );

      setSubmissions((current) =>
        current.map((submission) => {
          if (submission.id !== reviseTarget.submission.id) {
            return submission;
          }

          const nextAnswers = submission.answers.map((answer) =>
            answer.id === reviseTarget.answer.id ? { ...answer, ...updatedAnswer } : answer
          );

          return {
            ...submission,
            answers: nextAnswers,
            totalScore: nextAnswers.reduce((sum, answer) => sum + (answer.score ?? 0), 0),
          };
        })
      );

      setReviseOpen(false);
      setReviseAnswerId(null);
      setReviseReason("");
      toast.success("分数修改成功");
    } catch (reviseError) {
      toast.error(reviseError instanceof Error ? reviseError.message : "分数修改失败");
    } finally {
      setRevisePending(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-20 rounded-[28px]" />
        <Skeleton className="h-24 rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Skeleton className="h-[420px] rounded-[28px]" />
          <Skeleton className="h-[420px] rounded-[28px]" />
        </div>
      </PageContainer>
    );
  }

  if (error || !exam) {
    return (
      <PageContainer>
        <Card className="rounded-[28px] border-danger/30">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-text-strong">批改中心加载失败</h1>
            <p className="text-sm text-text-muted">{error ?? "未找到试卷数据"}</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer className="pb-36">
        <PageHeader
          title={exam.title}
          description={`${className || "未关联班级"}｜已提交 ${submittedCount}/总 ${totalStudents} 人`}
        />

        <Card className="rounded-[28px]">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="knowledge" className="bg-primary-soft text-primary">
                班级共 {totalStudents} 人
              </Badge>
              <Badge variant="knowledge">待发布 {unpublishedSubmissions.length} 份</Badge>
              {allPublished ? <Badge variant="success">成绩已全部发布</Badge> : null}
            </div>
            <ProgressBar value={gradedSubjectiveAnswers} total={totalSubjectiveAnswers} />
          </CardContent>
        </Card>

        {mainView === "overview" ? (
          <Card className="rounded-[28px]">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl">成绩概览</CardTitle>
                <p className="text-sm text-text-muted">
                  发布后学生将收到通知，可查看完整成绩。24 小时内仍可进入明细修改分数。
                </p>
              </div>
              <Button variant="secondary" onClick={() => setMainView("grading")}>
                查看批改明细
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-primary-soft p-5">
                  <p className="text-sm text-primary">平均分</p>
                  <p className="mt-2 text-4xl font-black text-primary">{overviewStats.average}</p>
                </div>
                <div className="rounded-[24px] bg-success-soft p-5">
                  <p className="text-sm text-success">最高分</p>
                  <p className="mt-2 text-4xl font-black text-success">{overviewStats.highest}</p>
                </div>
                <div className="rounded-[24px] bg-warning-soft p-5">
                  <p className="text-sm text-warning">最低分</p>
                  <p className="mt-2 text-4xl font-black text-warning">{overviewStats.lowest}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text-strong">各题得分率</h2>
                {overviewStats.questionRates.map(({ question, ratio, averageScore }) => (
                  <div
                    key={question.id}
                    className="rounded-[24px] border border-border bg-bg-card p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-text-strong">
                          第 {question.orderIndex} 题 · {questionTypeLabels[question.type]}
                        </p>
                        <p className="text-sm text-text-muted">平均得分 {averageScore} / {question.score}</p>
                      </div>
                      <span className="text-lg font-semibold text-primary">{ratio}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mainView === "grading" ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("question")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  tab === "question"
                    ? "bg-primary text-white"
                    : "bg-bg-elevated text-text-muted hover:text-primary"
                )}
              >
                按题目维度
              </button>
              <button
                type="button"
                onClick={() => setTab("student")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  tab === "student"
                    ? "bg-primary text-white"
                    : "bg-bg-elevated text-text-muted hover:text-primary"
                )}
              >
                按学生维度
              </button>
            </div>

            {tab === "question" ? (
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <Card className="h-fit rounded-[28px] lg:sticky lg:top-24">
                  <CardContent className="space-y-3 p-4">
                    {questions.map((question) => {
                      const gradedCount = submissions.reduce((total, submission) => {
                        const answer = submission.answers.find((item) => item.questionId === question.id);
                        return total + (answer?.gradedBy === "teacher" ? 1 : 0);
                      }, 0);
                      const clickable = isSubjectiveQuestion(question);

                      return (
                        <button
                          key={question.id}
                          type="button"
                          disabled={!clickable}
                          onClick={() => setSelectedQuestionId(question.id)}
                          className={cn(
                            "w-full rounded-[20px] border px-4 py-3 text-left transition-colors",
                            !clickable &&
                              "cursor-not-allowed border-border bg-bg-elevated/70 text-text-subtle",
                            clickable &&
                              selectedQuestionId === question.id &&
                              "border-primary bg-primary-soft",
                            clickable &&
                              selectedQuestionId !== question.id &&
                              "border-border hover:border-primary/40 hover:bg-bg-elevated"
                          )}
                        >
                          <p className="font-medium text-text-strong">第 {question.orderIndex} 题</p>
                          <p className="mt-1 text-sm text-text-muted">
                            {questionTypeLabels[question.type]}
                          </p>
                          <p className="mt-2 text-xs text-text-subtle">
                            {clickable
                              ? `已批改 ${gradedCount}/${submittedCount}`
                              : "已自动批改"}
                          </p>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {currentQuestion ? (
                    <>
                      <Card className="rounded-[28px]">
                        <CardContent className="space-y-4 p-8">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                              <p className="text-sm uppercase tracking-[0.18em] text-text-muted">
                                Question {currentQuestion.orderIndex}
                              </p>
                              <div className="text-base text-text-strong">
                                <MathText text={currentQuestion.content} />
                              </div>
                            </div>
                            <Badge variant="ai">满分 {currentQuestion.score} 分</Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-5">
                        {currentQuestionAnswers.map(({ submission, answer }) => {
                          const student = studentMap.get(submission.studentId);

                          return (
                            <AnswerCard
                              key={answer.id}
                              answer={answer}
                              draft={drafts[answer.id]}
                              saveError={saveErrors[answer.id]}
                              saving={savingIds[answer.id]}
                              studentName={student?.name ?? "未命名学生"}
                              studentAvatar={student?.avatar ?? null}
                              submittedAt={submission.submittedAt}
                              publishedAt={submission.publishedAt}
                              published={submission.status === "published"}
                              onDraftChange={handleDraftChange}
                              onAppendQuickComment={appendQuickComment}
                              onOpenImage={setImagePreviewUrl}
                              onOpenRevision={(answerId) => {
                                setReviseAnswerId(answerId);
                                setReviseReason("");
                                setReviseOpen(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <Card className="rounded-[28px]">
                      <CardContent className="p-8 text-sm text-text-muted">
                        当前试卷没有主观题，无需进入人工批改。
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <Card className="h-fit rounded-[28px] lg:sticky lg:top-24">
                  <CardContent className="space-y-3 p-4">
                    {students.map((student) => {
                      const submission = submissions.find((item) => item.studentId === student.id);
                      const gradedCount =
                        submission?.answers.filter(
                          (answer) =>
                            isSubjectiveQuestion(answer.question) && answer.gradedBy === "teacher"
                        ).length ?? 0;

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors",
                            selectedStudentId === student.id
                              ? "border-primary bg-primary-soft"
                              : "border-border hover:border-primary/40 hover:bg-bg-elevated"
                          )}
                        >
                          <Avatar className="size-10">
                            <AvatarImage src={student.avatar ?? undefined} alt={student.name} />
                            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-text-strong">{student.name}</p>
                            <p className="text-xs text-text-muted">
                              {gradedCount}/{subjectiveQuestions.length}
                            </p>
                          </div>
                          {gradedCount === subjectiveQuestions.length && submission ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : null}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="space-y-5">
                  {currentStudent ? (
                    (() => {
                      const submission = submissions.find((item) => item.studentId === currentStudent.id);

                      if (!submission) {
                        return (
                          <Card className="rounded-[28px]">
                            <CardContent className="p-8 text-sm text-text-muted">
                              该学生尚未提交试卷，当前没有可批改内容。
                            </CardContent>
                          </Card>
                        );
                      }

                      return submission.answers
                        .filter((answer) => isSubjectiveQuestion(answer.question))
                        .map((answer) => (
                          <AnswerCard
                            key={answer.id}
                            answer={answer}
                            draft={drafts[answer.id]}
                            saveError={saveErrors[answer.id]}
                            saving={savingIds[answer.id]}
                            studentName={currentStudent.name}
                            studentAvatar={currentStudent.avatar ?? null}
                            submittedAt={submission.submittedAt}
                            publishedAt={submission.publishedAt}
                            published={submission.status === "published"}
                            onDraftChange={handleDraftChange}
                            onAppendQuickComment={appendQuickComment}
                            onOpenImage={setImagePreviewUrl}
                            onOpenRevision={(answerId) => {
                              setReviseAnswerId(answerId);
                              setReviseReason("");
                              setReviseOpen(true);
                            }}
                          />
                        ));
                    })()
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : null}
      </PageContainer>

      {!allPublished ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/92 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-8 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-text-muted">
              {allGradingFinished
                ? "全部主观题已批改完成，可以发布成绩。"
                : `剩余 ${pendingStudentsCount} 份未批改`}
            </div>
            <Button
              size="lg"
              disabled={!allGradingFinished}
              onClick={() => setPublishOpen(true)}
            >
              全部批改完成后发布成绩
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog.Root open={Boolean(imagePreviewUrl)} onOpenChange={(open) => !open && setImagePreviewUrl(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-bg-card p-4 shadow-xl">
            <div className="mb-3 flex justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-strong"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="学生附件" className="max-h-[75vh] w-full rounded-[20px] object-contain" />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={publishOpen} onOpenChange={setPublishOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Dialog.Title className="text-2xl font-semibold text-text-strong">
                  发布成绩
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted">
                  发布后学生将收到通知，可查看完整成绩。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-strong"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setPublishMode("individual")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  publishMode === "individual"
                    ? "bg-primary text-white"
                    : "bg-bg-elevated text-text-muted"
                )}
              >
                逐个发布
              </button>
              <button
                type="button"
                onClick={() => setPublishMode("all")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  publishMode === "all" ? "bg-primary text-white" : "bg-bg-elevated text-text-muted"
                )}
              >
                全班发布
              </button>
            </div>

            {publishMode === "individual" ? (
              <div className="mt-6 space-y-3">
                {unpublishedSubmissions.map((submission) => {
                  const student = studentMap.get(submission.studentId);
                  const checked = selectedPublishIds.includes(submission.id);

                  return (
                    <label
                      key={submission.id}
                      className="flex cursor-pointer items-center justify-between rounded-[20px] border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedPublishIds((current) =>
                              event.target.checked
                                ? [...current, submission.id]
                                : current.filter((item) => item !== submission.id)
                            );
                          }}
                          className="size-4 rounded border-border text-primary"
                        />
                        <span className="font-medium text-text-strong">
                          {student?.name ?? "未命名学生"}
                        </span>
                      </div>
                      <span className="text-sm text-text-muted">
                        提交于 {formatDateTime(submission.submittedAt)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => void publishScores()} disabled={publishPending}>
                {publishPending ? <Loader2 className="size-4 animate-spin" /> : null}
                确认发布
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={reviseOpen}
        onOpenChange={(open) => {
          setReviseOpen(open);
          if (!open) {
            setReviseAnswerId(null);
            setReviseReason("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Dialog.Title className="text-2xl font-semibold text-text-strong">
                  修改分数
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted">
                  已发布成绩仅允许在 24 小时内修改，且必须填写修改原因。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-strong"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>

            {reviseTarget ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[20px] bg-bg-elevated p-4 text-sm text-text-muted">
                  {studentMap.get(reviseTarget.submission.studentId)?.name ?? "未命名学生"} · 第{" "}
                  {reviseTarget.answer.question.orderIndex} 题
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-text-strong">
                    修改后分数（满分 {reviseTarget.answer.question.score}）
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={reviseTarget.answer.question.score}
                    value={drafts[reviseTarget.answer.id]?.scoreInput ?? ""}
                    onChange={(event) =>
                      handleDraftChange(reviseTarget.answer, "scoreInput", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-text-strong">批注</span>
                  <textarea
                    value={drafts[reviseTarget.answer.id]?.teacherComment ?? ""}
                    onChange={(event) =>
                      handleDraftChange(reviseTarget.answer, "teacherComment", event.target.value)
                    }
                    className={cn(textareaClassName, "min-h-32")}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-text-strong">修改原因</span>
                  <textarea
                    value={reviseReason}
                    onChange={(event) => setReviseReason(event.target.value)}
                    className={cn(textareaClassName, "min-h-28")}
                    placeholder="说明为何需要修改该题分数"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => void submitRevision()} disabled={revisePending || !reviseTarget}>
                {revisePending ? <Loader2 className="size-4 animate-spin" /> : null}
                确认修改
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function AnswerCard({
  answer,
  draft,
  saveError,
  saving,
  studentName,
  studentAvatar,
  submittedAt,
  publishedAt,
  published,
  onDraftChange,
  onAppendQuickComment,
  onOpenImage,
  onOpenRevision,
}: {
  answer: SubmissionAnswer;
  draft?: GradeDraft;
  saveError?: string | null;
  saving?: boolean;
  studentName: string;
  studentAvatar: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  published: boolean;
  onDraftChange: (answer: SubmissionAnswer, field: keyof GradeDraft, value: string) => void;
  onAppendQuickComment: (answer: SubmissionAnswer, comment: string) => void;
  onOpenImage: (url: string) => void;
  onOpenRevision: (answerId: string) => void;
}) {
  const resolvedAttachment = attachmentSrc(answer.attachmentUrl);
  const canRevise = published && isWithinRevisionWindow(publishedAt);

  return (
    <Card className="rounded-[28px]">
      <CardContent className="space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarImage src={studentAvatar ?? undefined} alt={studentName} />
              <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-text-strong">{studentName}</p>
              <p className="text-sm text-text-muted">提交时间 {formatDateTime(submittedAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {published ? <Badge variant="success">已发布</Badge> : null}
            {answer.gradedBy === "teacher" ? <Badge variant="ai">已批改</Badge> : null}
            {saving ? (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                自动保存中
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-text-strong">题干</p>
          <div className="rounded-[24px] bg-bg-elevated p-5 text-sm text-text-default">
            <MathText text={answer.question.content} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-text-strong">学生作答</p>
          <textarea
            readOnly
            value={answer.studentAnswer ?? ""}
            className={cn(textareaClassName, "min-h-32 bg-bg-elevated/40")}
          />
        </div>

        {resolvedAttachment ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-strong">附件图片</p>
            <button
              type="button"
              onClick={() => onOpenImage(resolvedAttachment)}
              className="overflow-hidden rounded-[24px] border border-border"
            >
              <img src={resolvedAttachment} alt="学生作答附件" className="h-44 w-full object-cover" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[20px] bg-bg-elevated px-4 py-3 text-sm text-text-muted">
            <ImageIcon className="size-4" />
            未上传附件图片
          </div>
        )}

        {published ? (
          <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-strong">得分</p>
              <div className="rounded-[20px] bg-primary-soft px-4 py-3 text-xl font-semibold text-primary">
                {answer.score ?? 0} / {answer.question.score}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-strong">教师批注</p>
              <div className="min-h-20 rounded-[20px] bg-bg-elevated px-4 py-3 text-sm text-text-default">
                {(draft?.teacherComment ?? answer.teacherComment ?? "").trim() || "未填写批注"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-text-strong">分数</span>
              <input
                type="number"
                min={0}
                max={answer.question.score}
                value={draft?.scoreInput ?? ""}
                onChange={(event) => onDraftChange(answer, "scoreInput", event.target.value)}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-text-strong">批注</span>
              <textarea
                value={draft?.teacherComment ?? ""}
                onChange={(event) => onDraftChange(answer, "teacherComment", event.target.value)}
                className={cn(textareaClassName, "min-h-28")}
                placeholder="输入批改意见"
              />
            </label>
          </div>
        )}

        {!published ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-strong">常用评语</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMMENTS.map((comment) => (
                <button
                  key={comment}
                  type="button"
                  onClick={() => onAppendQuickComment(answer, comment)}
                  className="rounded-full border border-border bg-bg-card px-3 py-2 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {comment}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-danger">{saveError ?? ""}</div>
          {canRevise ? (
            <Button variant="secondary" size="sm" onClick={() => onOpenRevision(answer.id)}>
              <Check className="size-4" />
              修改分数
            </Button>
          ) : published ? (
            <span className="text-xs text-text-subtle">
              {publishedAt ? "超过 24 小时后不可再修改" : "已发布"}
            </span>
          ) : (
            <span className="text-xs text-text-subtle">评分将在停止输入 500ms 后自动保存</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
