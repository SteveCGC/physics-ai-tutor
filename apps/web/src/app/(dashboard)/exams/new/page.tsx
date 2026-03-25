"use client";

import { useEffect, useMemo, useState } from "react";
import { knowledgePointGroups, type Question } from "@physics-ai-tutor/shared";
import { ArrowLeft, ChevronDown, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  DifficultyStars,
  difficultyLabels,
  inputClassName,
  questionTypeLabels,
  questionTypeOptions,
  textareaClassName,
} from "@/components/exams/exam-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { MathText } from "@/components/ui/katex-renderer";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type GenerationPhase = "config" | "generating";
type GenerationStep = {
  key: string;
  status: "pending" | "completed";
  message: string;
};

type GenerateQuestionEvent = {
  question: Question;
  progress: number;
  message: string;
};

type LegacyStepEvent = {
  event: "step";
  step: "parse-requirements" | "generate-questions" | "quality-check" | "save-draft";
  status: "done";
};

type StepEventPayload = {
  key?: string;
  message?: string;
  progress?: number;
  step?: LegacyStepEvent["step"];
};

type RawGeneratedQuestion = Pick<
  Question,
  | "type"
  | "content"
  | "answer"
  | "difficulty"
  | "score"
> & {
  options?: string[] | null;
  acceptedAnswers?: string[] | null;
  explanation?: string | null;
  knowledgePoints?: string[] | null;
  qualityFlags?: Question["qualityFlags"];
};

type LegacyQuestionsEvent = {
  event: "questions";
  data: RawGeneratedQuestion[];
};

type CreateExamResponse = {
  id: string;
};

function FadeInQuestionCard({ question, index }: { question: Question; index: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-bg-card p-5 shadow-sm transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="ai">第 {index + 1} 题</Badge>
          <Badge variant="knowledge">{questionTypeLabels[question.type]}</Badge>
        </div>
        <span className="text-sm text-text-muted">{question.score} 分</span>
      </div>
      <div className="space-y-3">
        <div className="text-sm leading-7 text-text-default">
          <MathText text={question.content} />
        </div>
        {question.options?.length ? (
          <div className="grid gap-2 text-sm text-text-muted">
            {question.options.map((option, optionIndex) => (
              <div key={`${question.id}-${optionIndex}`} className="rounded-xl bg-bg-elevated px-3 py-2">
                {String.fromCharCode(65 + optionIndex)}. <MathText text={option} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildExamTitle(selectedPoints: string[]) {
  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (selectedPoints.length === 0) {
    return `AI 练习卷 ${today}`;
  }

  if (selectedPoints.length === 1) {
    return `${selectedPoints[0]} 练习卷 ${today}`;
  }

  return `${selectedPoints[0]}等 ${selectedPoints.length} 个知识点练习卷 ${today}`;
}

function parseSseEvent(block: string) {
  const lines = block.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) {
    return null;
  }

  return {
    event,
    data: JSON.parse(data) as unknown,
  };
}

function mapLegacyStepPayload(payload: StepEventPayload) {
  if (payload.key && payload.message && typeof payload.progress === "number") {
    return {
      key: payload.key,
      message: payload.message,
      progress: payload.progress,
    };
  }

  switch (payload.step) {
    case "parse-requirements":
      return {
        key: "prepare",
        message: "已确认出题要求",
        progress: 15,
      };
    case "generate-questions":
      return {
        key: "prepare",
        message: "题目生成完成",
        progress: 65,
      };
    case "quality-check":
      return {
        key: "quality_check",
        message: "质量检查完成",
        progress: 90,
      };
    case "save-draft":
      return {
        key: "save_draft",
        message: "试卷草稿已保存",
        progress: 95,
      };
    default:
      return null;
  }
}

function toPreviewQuestion(
  examId: string,
  question: RawGeneratedQuestion,
  index: number
): Question {
  return {
    id: `preview-${index + 1}`,
    examId,
    type: question.type,
    content: question.content,
    options: question.options ?? null,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers ?? null,
    explanation: question.explanation ?? null,
    knowledgePoints: question.knowledgePoints ?? null,
    difficulty: question.difficulty,
    score: question.score,
    orderIndex: index + 1,
    source: "ai",
    qualityFlags: question.qualityFlags ?? null,
    createdAt: new Date().toISOString(),
  };
}

export default function NewExamPage() {
  const router = useRouter();
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Question["type"][]>(["choice", "fill"]);
  const [difficulty, setDifficulty] = useState(3);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [phase, setPhase] = useState<GenerationPhase>("config");
  const [steps, setSteps] = useState<GenerationStep[]>([
    { key: "prepare", status: "pending", message: "等待开始生成" },
    { key: "quality_check", status: "pending", message: "等待质量检查" },
  ]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("选择配置后开始生成");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>(
    knowledgePointGroups.map((group) => group.chapter)
  );

  const selectedKnowledgeSet = useMemo(
    () => new Set(selectedKnowledgePoints),
    [selectedKnowledgePoints]
  );

  function toggleKnowledgePoint(point: string) {
    setSelectedKnowledgePoints((current) =>
      current.includes(point) ? current.filter((item) => item !== point) : [...current, point]
    );
  }

  function toggleQuestionType(type: Question["type"]) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  function toggleChapter(chapter: string) {
    setExpandedChapters((current) =>
      current.includes(chapter)
        ? current.filter((item) => item !== chapter)
        : [...current, chapter]
    );
  }

  function updateChapterSelection(chapterPoints: string[], checked: boolean) {
    setSelectedKnowledgePoints((current) => {
      const next = new Set(current);

      for (const point of chapterPoints) {
        if (checked) {
          next.add(point);
        } else {
          next.delete(point);
        }
      }

      return Array.from(next);
    });
  }

  async function startGeneration() {
    if (selectedKnowledgePoints.length === 0) {
      setError("至少选择一个知识点");
      return;
    }

    if (selectedTypes.length === 0) {
      setError("至少选择一种题型");
      return;
    }

    setSubmitting(true);
    setError(null);
    setGeneratedQuestions([]);
    setPhase("generating");
    setProgress(5);
    setStatusText("⏳ 正在创建草稿试卷...");
    setSteps([
      { key: "prepare", status: "pending", message: "正在生成题目..." },
      { key: "quality_check", status: "pending", message: "等待质量检查" },
    ]);

    try {
      const exam = await fetchJson<CreateExamResponse>("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildExamTitle(selectedKnowledgePoints),
          classId: null,
          knowledgePoints: selectedKnowledgePoints,
          deadline: null,
        }),
      });

      setActiveExamId(exam.id);
      setStatusText("⏳ 正在生成题目...");

      const response = await fetch(`/api/exams/${exam.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          knowledgePoints: selectedKnowledgePoints,
          questionTypes: selectedTypes,
          totalQuestions,
          difficulty,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "生成失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsed = parseSseEvent(block);
          if (!parsed) {
            continue;
          }

          if (parsed.event === "step") {
            const mapped = mapLegacyStepPayload(parsed.data as StepEventPayload);
            if (!mapped) {
              continue;
            }

            setProgress(mapped.progress);
            setStatusText(mapped.key === "quality_check" ? "✅ 质量检查完成" : "⏳ 正在生成题目...");
            setSteps((current) =>
              current.map((item) =>
                item.key === mapped.key
                  ? { ...item, status: "completed", message: mapped.message }
                  : item
              )
            );
          }

          if (parsed.event === "questions") {
            const payload = parsed.data as GenerateQuestionEvent | LegacyQuestionsEvent;

            if ("question" in payload) {
              setGeneratedQuestions((current) => [...current, payload.question]);
              setProgress(payload.progress);
              setStatusText(`⏳ 正在生成题目... 已完成 ${payload.question.orderIndex} / ${totalQuestions}`);
              continue;
            }

            setGeneratedQuestions(
              payload.data.map((question, index) =>
                toPreviewQuestion(exam.id, question, index)
              )
            );
            setProgress(70);
            setStatusText(`⏳ 正在生成题目... 已完成 ${payload.data.length} / ${totalQuestions}`);
          }

          if (parsed.event === "done") {
            setProgress(100);
            setStatusText("✅ 质量检查完成");
            router.push(`/exams/${exam.id}`);
            return;
          }

          if (parsed.event === "error") {
            const payload = parsed.data as { message?: string };
            throw new Error(payload.message ?? "生成失败");
          }
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "生成失败");
      setPhase("config");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/exams">
            <ArrowLeft className="size-4" />
            返回
          </Link>
        </Button>
      </div>
      <PageHeader
        title="AI 出题"
        description="按知识点和题型快速生成一套可审查、可编辑的物理试卷。"
      />

      {phase === "config" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">出题配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6">
              <Field
                label="题型"
                required
                hint={`${selectedTypes.length} 种题型`}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {questionTypeOptions.map((option) => {
                    const checked = selectedTypes.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-[16px] border px-4 py-3 transition-colors",
                          checked
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-bg-card text-text-default"
                        )}
                      >
                        <span>{option.label}</span>
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-primary)]"
                          checked={checked}
                          onChange={() => toggleQuestionType(option.value)}
                        />
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>

            <Field
              label="知识点"
              required
              hint={`已选 ${selectedKnowledgePoints.length} 个知识点`}
            >
              <div className="space-y-3">
                {knowledgePointGroups.map((group) => {
                  const selectedCount = group.items.filter((item) => selectedKnowledgeSet.has(item)).length;
                  const allSelected = selectedCount === group.items.length;
                  const expanded = expandedChapters.includes(group.chapter);

                  return (
                    <div
                      key={group.chapter}
                      className="rounded-[18px] border border-border bg-bg-card shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left text-base font-semibold text-text-strong"
                          onClick={() => toggleChapter(group.chapter)}
                        >
                          <ChevronDown
                            className={cn("size-4 transition-transform", expanded ? "rotate-0" : "-rotate-90")}
                          />
                          {group.chapter}
                          <span className="text-sm font-normal text-text-muted">
                            {selectedCount}/{group.items.length}
                          </span>
                        </button>
                        <div className="flex items-center gap-2 text-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateChapterSelection(group.items, true)}
                          >
                            全选本章
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateChapterSelection(group.items, false)}
                          >
                            取消本章
                          </Button>
                          {allSelected ? <Badge variant="success">已全选</Badge> : null}
                        </div>
                      </div>
                      {expanded ? (
                        <div className="grid gap-3 border-t border-border px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
                          {group.items.map((point) => {
                            const checked = selectedKnowledgeSet.has(point);
                            return (
                              <label
                                key={point}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                                  checked
                                    ? "border-primary bg-primary-soft text-primary"
                                    : "border-border bg-bg-elevated text-text-default"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 accent-[var(--color-primary)]"
                                  checked={checked}
                                  onChange={() => toggleKnowledgePoint(point)}
                                />
                                <span className="text-sm">{point}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              <Field
                label="难度"
                required
                hint={`${difficulty} = ${difficultyLabels[difficulty]}`}
              >
                <div className="rounded-[18px] border border-border bg-bg-card px-5 py-5">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={difficulty}
                    onChange={(event) => setDifficulty(Number(event.target.value))}
                    className="w-full accent-[var(--color-primary)]"
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <DifficultyStars value={difficulty} />
                    <Badge variant="knowledge">{difficultyLabels[difficulty]}</Badge>
                  </div>
                </div>
              </Field>

              <Field label="题目数量" required hint="范围 1 - 30">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={totalQuestions}
                  onChange={(event) =>
                    setTotalQuestions(Math.min(30, Math.max(1, Number(event.target.value) || 1)))
                  }
                  className={inputClassName}
                />
              </Field>
            </div>

            {error ? (
              <div className="rounded-[16px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              onClick={() => void startGeneration()}
              disabled={submitting}
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              开始生成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-text-subtle">Generation</p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-strong">正在生成试卷</h2>
                </div>
                {activeExamId ? <Badge variant="ai">草稿 #{activeExamId.slice(0, 8)}</Badge> : null}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className="h-full rounded-full bg-[var(--gradient-primary)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                <span>{statusText}</span>
                <span>进度 {progress}%</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {steps.map((step) => (
                  <div
                    key={step.key}
                    className="rounded-[16px] border border-border bg-bg-elevated px-4 py-3"
                  >
                    <p className="text-sm font-medium text-text-strong">
                      {step.status === "completed" ? "✅" : "⏳"} {step.message}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {generatedQuestions.map((question, index) => (
              <FadeInQuestionCard key={question.id} question={question} index={index} />
            ))}
          </div>

          {generatedQuestions.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-56 items-center justify-center p-6 text-sm text-text-muted">
                题目生成后会逐题显示在这里。
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
