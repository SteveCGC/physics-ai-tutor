"use client";

import type { Exam, ExamStatus, Question, QuestionType } from "@physics-ai-tutor/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TeacherClass = {
  id: string;
  name: string;
  grade: string;
  inviteCode: string;
  studentCount: number;
};

export type ExamWithQuestions = Exam & {
  questions: Question[];
  questionCount?: number;
  pendingGradeCount?: number;
};

export const questionTypeLabels: Record<QuestionType, string> = {
  choice: "选择题",
  fill: "填空题",
  calculation: "计算题",
  short_answer: "简答题",
};

export const difficultyLabels: Record<number, string> = {
  1: "基础",
  2: "简单",
  3: "综合",
  4: "提升",
  5: "竞赛",
};

export const questionTypeOptions: Array<{ value: QuestionType; label: string }> = [
  { value: "choice", label: "选择题" },
  { value: "fill", label: "填空题" },
  { value: "calculation", label: "计算题" },
  { value: "short_answer", label: "简答题" },
];

export const inputClassName =
  "flex h-12 w-full rounded-xl border border-border bg-bg-card px-4 text-sm text-text-default shadow-sm transition-colors placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15";

export const textareaClassName =
  "min-h-28 w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm text-text-default shadow-sm transition-colors placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15";

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeListDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DifficultyStars({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 text-warning", className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < value ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
    </div>
  );
}

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  if (status === "published") {
    return <Badge variant="success">已发布</Badge>;
  }

  if (status === "archived") {
    return <Badge variant="warning">已归档</Badge>;
  }

  return (
    <Badge variant="knowledge" className="bg-bg-elevated text-text-muted">
      草稿
    </Badge>
  );
}

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  return <Badge variant="knowledge">{questionTypeLabels[type]}</Badge>;
}

export function calculateTotalScore(questions: Question[]) {
  return questions.reduce((sum, question) => sum + question.score, 0);
}

export function countByQuestionType(questions: Question[]) {
  return questionTypeOptions.map(({ value, label }) => ({
    type: value,
    label,
    count: questions.filter((question) => question.type === value).length,
  }));
}

export function countByDifficulty(questions: Question[]) {
  return Array.from({ length: 5 }).map((_, index) => {
    const difficulty = index + 1;
    return {
      difficulty,
      label: difficultyLabels[difficulty],
      count: questions.filter((question) => question.difficulty === difficulty).length,
    };
  });
}
