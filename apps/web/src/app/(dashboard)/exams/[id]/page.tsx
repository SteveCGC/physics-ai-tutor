"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Question, QuestionType } from "@physics-ai-tutor/shared";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  calculateTotalScore,
  countByDifficulty,
  countByQuestionType,
  DifficultyStars,
  difficultyLabels,
  ExamStatusBadge,
  formatDateTime,
  inputClassName,
  QuestionTypeBadge,
  questionTypeLabels,
  questionTypeOptions,
  textareaClassName,
  type ExamWithQuestions,
  type TeacherClass,
} from "@/components/exams/exam-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MathText } from "@/components/ui/katex-renderer";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type EditableQuestion = Pick<
  Question,
  "content" | "answer" | "explanation" | "score" | "difficulty"
> & {
  options: string[];
};

type ManualQuestionForm = {
  type: QuestionType;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  score: number;
  difficulty: number;
};

const defaultManualQuestionForm: ManualQuestionForm = {
  type: "choice",
  content: "",
  options: ["", "", "", ""],
  answer: "",
  explanation: "",
  score: 8,
  difficulty: 3,
};

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultDeadlineValue() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return formatDateTimeLocalValue(date);
}

function buildEditableQuestion(question: Question): EditableQuestion {
  return {
    content: question.content,
    options: question.options ?? ["", "", "", ""],
    answer: question.answer,
    explanation: question.explanation ?? "",
    score: question.score,
    difficulty: question.difficulty,
  };
}

export default function ExamReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;
  const [exam, setExam] = useState<ExamWithQuestions | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<EditableQuestion | null>(null);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({
    classId: "",
    deadline: "",
  });
  const [manualQuestion, setManualQuestion] =
    useState<ManualQuestionForm>(defaultManualQuestionForm);

  async function loadExam() {
    setLoading(true);
    setError(null);

    try {
      const [examData, classData] = await Promise.all([
        fetchJson<ExamWithQuestions>(`/api/exams/${examId}`),
        fetchJson<TeacherClass[]>("/api/classes"),
      ]);

      setExam(examData);
      setClasses(classData);
      setTitleDraft(examData.title);
      setPublishForm({
        classId: examData.classId ?? "",
        deadline: examData.deadline
          ? formatDateTimeLocalValue(new Date(examData.deadline))
          : getDefaultDeadlineValue(),
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "试卷加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExam();
  }, [examId]);

  const questions = exam?.questions ?? [];
  const totalScore = useMemo(() => calculateTotalScore(questions), [questions]);
  const typeDistribution = useMemo(() => countByQuestionType(questions), [questions]);
  const difficultyDistribution = useMemo(() => countByDifficulty(questions), [questions]);

  useEffect(() => {
    if (!publishOpen) {
      return;
    }

    setPublishForm((current) => ({
      classId: current.classId || exam?.classId || classes[0]?.id || "",
      deadline: current.deadline || getDefaultDeadlineValue(),
    }));
  }, [publishOpen, exam?.classId, classes]);

  async function updateExam(payload: Record<string, unknown>) {
    const updated = await fetchJson<ExamWithQuestions>(`/api/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setExam((current) => (current ? { ...current, ...updated } : current));
    return updated;
  }

  async function saveTitle() {
    if (!exam || titleDraft.trim() === "" || titleDraft.trim() === exam.title) {
      setEditingTitle(false);
      setTitleDraft(exam?.title ?? "");
      return;
    }

    setSavingTitle(true);
    try {
      const updated = await updateExam({ title: titleDraft.trim() });
      setExam((current) => (current ? { ...current, title: updated.title } : current));
      setEditingTitle(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "标题保存失败");
    } finally {
      setSavingTitle(false);
    }
  }

  function beginQuestionEdit(question: Question) {
    setEditingQuestionId(question.id);
    setQuestionDraft(buildEditableQuestion(question));
  }

  function cancelQuestionEdit() {
    setEditingQuestionId(null);
    setQuestionDraft(null);
  }

  async function saveQuestion(question: Question) {
    if (!questionDraft) {
      return;
    }

    setBusyQuestionId(question.id);
    try {
      const updated = await fetchJson<Question>(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: questionDraft.content,
          options: question.type === "choice" ? questionDraft.options : undefined,
          answer: questionDraft.answer,
          explanation: questionDraft.explanation,
          score: questionDraft.score,
          difficulty: questionDraft.difficulty,
        }),
      });

      setExam((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              ),
              totalScore: calculateTotalScore(
                current.questions.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
              ),
            }
          : current
      );
      cancelQuestionEdit();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "题目保存失败");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function regenerateQuestion(questionId: string) {
    if (!window.confirm("确认重新生成这道题目？")) {
      return;
    }

    setBusyQuestionId(questionId);
    try {
      const updated = await fetchJson<Question>(`/api/questions/${questionId}/regenerate`, {
        method: "POST",
      });

      setExam((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              ),
            }
          : current
      );
      if (editingQuestionId === questionId) {
        beginQuestionEdit(updated);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "单题重新生成失败");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!window.confirm("确认删除这道题目？删除后不可恢复。")) {
      return;
    }

    setBusyQuestionId(questionId);
    try {
      await fetchJson<{ success: true }>(`/api/questions/${questionId}`, {
        method: "DELETE",
      });
      setExam((current) =>
        current
          ? {
              ...current,
              questions: current.questions
                .filter((item) => item.id !== questionId)
                .map((item, index) => ({ ...item, orderIndex: index + 1 })),
            }
          : current
      );
      if (editingQuestionId === questionId) {
        cancelQuestionEdit();
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "删除失败");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function addManualQuestion() {
    if (!exam) {
      return;
    }

    try {
      const created = await fetchJson<Question>(`/api/exams/${exam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: manualQuestion.type,
          content: manualQuestion.content,
          options: manualQuestion.type === "choice" ? manualQuestion.options : undefined,
          answer: manualQuestion.answer,
          explanation: manualQuestion.explanation || undefined,
          knowledgePoints: exam.knowledgePoints ?? [],
          difficulty: manualQuestion.difficulty,
          score: manualQuestion.score,
        }),
      });

      setExam((current) =>
        current
          ? {
              ...current,
              questions: [...current.questions, created],
            }
          : current
      );
      setManualQuestion(defaultManualQuestionForm);
      setManualSheetOpen(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "手动添加题目失败");
    }
  }

  async function publishExam() {
    try {
      await fetchJson(`/api/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: publishForm.classId,
          deadline: publishForm.deadline
            ? new Date(publishForm.deadline).toISOString()
            : null,
          status: "published",
        }),
      });

      router.push("/exams");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "发布失败");
    }
  }

  const currentClass = classes.find((item) => item.id === exam?.classId);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/exams");
  }

  return (
    <PageContainer className="pb-36">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={goBack}>
          <ArrowLeft className="size-4" />
          返回
        </Button>
      </div>
      <PageHeader
        title="试卷审查"
        description="逐题检查 AI 生成结果，必要时编辑、删题、补题后再发布。"
        action={
          exam?.status === "draft" ? (
            <Button onClick={() => setPublishOpen(true)}>发布</Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-[16px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-80 items-center justify-center p-6 text-text-muted">
            正在加载试卷...
          </CardContent>
        </Card>
      ) : null}

      {!loading && !exam ? (
        <Card>
          <CardContent className="flex min-h-80 items-center justify-center p-6 text-text-muted">
            未找到试卷信息。
          </CardContent>
        </Card>
      ) : null}

      {exam ? (
        <>
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <Card>
                <CardContent className="flex flex-col gap-5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {editingTitle ? (
                          <input
                            className={inputClassName}
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onBlur={() => void saveTitle()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void saveTitle();
                              }
                              if (event.key === "Escape") {
                                setEditingTitle(false);
                                setTitleDraft(exam.title);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-text-strong">{exam.title}</h2>
                            {exam.status === "draft" ? (
                              <button
                                type="button"
                                onClick={() => setEditingTitle(true)}
                                className="rounded-full p-2 text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                                aria-label="编辑试卷标题"
                              >
                                {savingTitle ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Pencil className="size-4" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        )}
                        <ExamStatusBadge status={exam.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                        <span>{questions.length} 题</span>
                        <span>总分 {totalScore}</span>
                        <span>班级 {currentClass ? `${currentClass.grade} · ${currentClass.name}` : "未匹配"}</span>
                        <span>截止 {formatDateTime(exam.deadline)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {questions.map((question, index) => {
                  const isEditing = editingQuestionId === question.id;
                  const draft = isEditing ? questionDraft : null;

                  return (
                    <Card key={question.id}>
                      <CardContent className="space-y-5 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="ai">第 {index + 1} 题</Badge>
                              <QuestionTypeBadge type={question.type} />
                              <DifficultyStars value={question.difficulty} />
                              <Badge variant="knowledge">{question.score} 分</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {(question.knowledgePoints ?? []).map((point) => (
                                <Badge key={point} variant="knowledge">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {exam.status === "draft" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => beginQuestionEdit(question)}
                                  aria-label="编辑题目"
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void regenerateQuestion(question.id)}
                                  disabled={busyQuestionId === question.id}
                                  aria-label="重新生成题目"
                                >
                                  {busyQuestionId === question.id ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <RefreshCw />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void deleteQuestion(question.id)}
                                  disabled={busyQuestionId === question.id}
                                  aria-label="删除题目"
                                >
                                  <Trash />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {question.qualityFlags?.length ? (
                          <div className="rounded-[16px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                            <p className="mb-1 font-medium">质检提醒</p>
                            <ul className="space-y-1">
                              {question.qualityFlags.map((flag, flagIndex) => (
                                <li key={`${question.id}-flag-${flagIndex}`}>• {flag.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {isEditing && draft ? (
                          <div className="space-y-5 rounded-[18px] border border-border bg-bg-elevated p-5">
                            <Field label="题干">
                              <textarea
                                className={textareaClassName}
                                value={draft.content}
                                onChange={(event) =>
                                  setQuestionDraft((current) =>
                                    current ? { ...current, content: event.target.value } : current
                                  )
                                }
                              />
                            </Field>
                            <div className="rounded-[16px] border border-border bg-bg-card p-4 text-sm">
                              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-text-subtle">
                                KaTeX 预览
                              </p>
                              <MathText text={draft.content} />
                            </div>

                            {question.type === "choice" ? (
                              <div className="grid gap-3">
                                {draft.options.map((option, optionIndex) => (
                                  <Field
                                    key={`${question.id}-option-${optionIndex}`}
                                    label={`选项 ${String.fromCharCode(65 + optionIndex)}`}
                                  >
                                    <input
                                      className={inputClassName}
                                      value={option}
                                      onChange={(event) =>
                                        setQuestionDraft((current) =>
                                          current
                                            ? {
                                                ...current,
                                                options: current.options.map((item, currentIndex) =>
                                                  currentIndex === optionIndex ? event.target.value : item
                                                ),
                                              }
                                            : current
                                        )
                                      }
                                    />
                                  </Field>
                                ))}
                              </div>
                            ) : null}

                            <div className="grid gap-4 md:grid-cols-2">
                              <Field label="答案">
                                <input
                                  className={inputClassName}
                                  value={draft.answer}
                                  onChange={(event) =>
                                    setQuestionDraft((current) =>
                                      current ? { ...current, answer: event.target.value } : current
                                    )
                                  }
                                />
                              </Field>
                              <Field label="分值">
                                <input
                                  type="number"
                                  min={1}
                                  className={inputClassName}
                                  value={draft.score}
                                  onChange={(event) =>
                                    setQuestionDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            score: Math.max(1, Number(event.target.value) || 1),
                                          }
                                        : current
                                    )
                                  }
                                />
                              </Field>
                            </div>

                            <Field label="解析">
                              <textarea
                                className={textareaClassName}
                                value={draft.explanation ?? ""}
                                onChange={(event) =>
                                  setQuestionDraft((current) =>
                                    current ? { ...current, explanation: event.target.value } : current
                                  )
                                }
                              />
                            </Field>

                            <div className="flex flex-wrap gap-3">
                              <Button
                                onClick={() => void saveQuestion(question)}
                                disabled={busyQuestionId === question.id}
                              >
                                {busyQuestionId === question.id ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Save className="size-4" />
                                )}
                                保存
                              </Button>
                              <Button variant="secondary" onClick={cancelQuestionEdit}>
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-sm leading-7 text-text-default">
                              <MathText text={question.content} />
                            </div>

                            {question.options?.length ? (
                              <div className="grid gap-2 text-sm">
                                {question.options.map((option, optionIndex) => {
                                  const optionLetter = String.fromCharCode(65 + optionIndex);
                                  const isCorrect =
                                    question.answer.trim().toUpperCase() === optionLetter;

                                  return (
                                    <div
                                      key={`${question.id}-${optionIndex}`}
                                      className={cn(
                                        "rounded-xl border px-4 py-3",
                                        isCorrect
                                          ? "border-success/20 bg-success-soft text-success"
                                          : "border-border bg-bg-elevated text-text-muted"
                                      )}
                                    >
                                      {optionLetter}. <MathText text={option} />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}

                            <details className="group rounded-[16px] border border-border bg-bg-elevated">
                              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-text-strong">
                                <span>答案与解析</span>
                                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                              </summary>
                              <div className="space-y-3 border-t border-border px-4 py-4 text-sm text-text-default">
                                <div>
                                  <span className="font-medium text-text-strong">答案：</span>
                                  <span>{question.answer}</span>
                                </div>
                                {question.explanation ? (
                                  <div>
                                    <span className="font-medium text-text-strong">解析：</span>
                                    <MathText text={question.explanation} />
                                  </div>
                                ) : null}
                              </div>
                            </details>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 xl:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>统计概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-strong">题型分布</p>
                    <div className="space-y-2 text-sm text-text-muted">
                      {typeDistribution.map((item) => (
                        <div key={item.type} className="flex items-center justify-between gap-3">
                          <span>{item.label}</span>
                          <span>{item.count} 题</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-strong">难度分布</p>
                    <div className="space-y-3">
                      {difficultyDistribution.map((item) => {
                        const width = questions.length === 0 ? 0 : (item.count / questions.length) * 100;
                        return (
                          <div key={item.difficulty} className="space-y-1">
                            <div className="flex items-center justify-between text-sm text-text-muted">
                              <span>{item.label}</span>
                              <span>{item.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-border bg-bg-elevated px-4 py-4">
                    <p className="text-sm text-text-muted">总分</p>
                    <p className="mt-2 text-3xl font-bold text-text-strong">{totalScore}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg-card/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-8 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-text-muted">
                草稿支持实时编辑、手动补题和发布前检查。
              </div>
              <div className="flex flex-wrap gap-3">
                {exam.status === "draft" ? (
                  <>
                    <Button variant="secondary" onClick={() => setManualSheetOpen(true)}>
                      <Plus className="size-4" />
                      手动添加题目
                    </Button>
                    <Button onClick={() => setPublishOpen(true)}>发布试卷</Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <Dialog.Root open={publishOpen} onOpenChange={setPublishOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-border bg-bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Dialog.Title className="text-2xl font-semibold text-text-strong">
                      发布试卷
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-text-muted">
                      发布后学生可见，题目将不再允许编辑或删除。
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-full p-2 text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <X className="size-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="mt-6 space-y-4">
                  <Field label="发布班级">
                    <select
                      className={inputClassName}
                      value={publishForm.classId}
                      onChange={(event) =>
                        setPublishForm((current) => ({ ...current, classId: event.target.value }))
                      }
                    >
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.grade} · {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="截止时间">
                    <input
                      type="datetime-local"
                      className={inputClassName}
                      value={publishForm.deadline}
                      onChange={(event) =>
                        setPublishForm((current) => ({ ...current, deadline: event.target.value }))
                      }
                    />
                  </Field>
                  <div className="rounded-[16px] border border-border bg-bg-elevated px-4 py-3 text-sm text-text-muted">
                    当前共 {questions.length} 题，总分 {totalScore} 分。
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setPublishOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={() => void publishExam()}>
                    <Check className="size-4" />
                    确认发布
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <Dialog.Root open={manualSheetOpen} onOpenChange={setManualSheetOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/25" />
              <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-xl overflow-y-auto border-l border-border bg-bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Dialog.Title className="text-2xl font-semibold text-text-strong">
                      手动添加题目
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-text-muted">
                      按题型填写必要字段，保存后会追加到当前试卷尾部。
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-full p-2 text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <X className="size-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="mt-6 space-y-5">
                  <Field label="题型">
                    <select
                      className={inputClassName}
                      value={manualQuestion.type}
                      onChange={(event) =>
                        setManualQuestion((current) => ({
                          ...current,
                          type: event.target.value as QuestionType,
                        }))
                      }
                    >
                      {questionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="题干">
                    <textarea
                      className={textareaClassName}
                      value={manualQuestion.content}
                      onChange={(event) =>
                        setManualQuestion((current) => ({ ...current, content: event.target.value }))
                      }
                    />
                  </Field>

                  {manualQuestion.type === "choice" ? (
                    <div className="space-y-3">
                      {manualQuestion.options.map((option, optionIndex) => (
                        <Field
                          key={`manual-option-${optionIndex}`}
                          label={`选项 ${String.fromCharCode(65 + optionIndex)}`}
                        >
                          <input
                            className={inputClassName}
                            value={option}
                            onChange={(event) =>
                              setManualQuestion((current) => ({
                                ...current,
                                options: current.options.map((item, currentIndex) =>
                                  currentIndex === optionIndex ? event.target.value : item
                                ),
                              }))
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="答案">
                      <input
                        className={inputClassName}
                        placeholder={manualQuestion.type === "choice" ? "如：B" : "输入标准答案"}
                        value={manualQuestion.answer}
                        onChange={(event) =>
                          setManualQuestion((current) => ({ ...current, answer: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="分值">
                      <input
                        type="number"
                        min={1}
                        className={inputClassName}
                        value={manualQuestion.score}
                        onChange={(event) =>
                          setManualQuestion((current) => ({
                            ...current,
                            score: Math.max(1, Number(event.target.value) || 1),
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="解析">
                    <textarea
                      className={textareaClassName}
                      value={manualQuestion.explanation}
                      onChange={(event) =>
                        setManualQuestion((current) => ({
                          ...current,
                          explanation: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="难度">
                    <div className="rounded-[18px] border border-border bg-bg-elevated px-5 py-5">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        className="w-full accent-[var(--color-primary)]"
                        value={manualQuestion.difficulty}
                        onChange={(event) =>
                          setManualQuestion((current) => ({
                            ...current,
                            difficulty: Number(event.target.value),
                          }))
                        }
                      />
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <DifficultyStars value={manualQuestion.difficulty} />
                        <Badge variant="knowledge">
                          {difficultyLabels[manualQuestion.difficulty]}
                        </Badge>
                      </div>
                    </div>
                  </Field>

                  <div className="rounded-[16px] border border-border bg-bg-elevated px-4 py-3 text-sm text-text-muted">
                    知识点将沿用试卷配置：
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(exam.knowledgePoints ?? []).map((point) => (
                        <Badge key={point} variant="knowledge">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setManualSheetOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={() => void addManualQuestion()}>
                    <Plus className="size-4" />
                    添加题目
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : null}
    </PageContainer>
  );
}
