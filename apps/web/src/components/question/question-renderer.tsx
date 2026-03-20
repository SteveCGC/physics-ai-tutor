"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Upload, XCircle } from "lucide-react";
import type { Question, QuestionType } from "@physics-ai-tutor/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ReviewData = {
  isCorrect: boolean;
  score: number;
  feedback: string;
  teacherComment: string;
  correctAnswer: string;
  explanation: string;
};

interface QuestionRendererProps {
  question: Pick<Question, "id" | "content" | "options" | "score" | "knowledgePoints"> & {
    type: QuestionType;
  };
  mode: "answer" | "review" | "readonly";
  value?: string;
  onValueChange?: (value: string) => void;
  reviewData?: Partial<ReviewData>;
  attachmentUrl?: string | null;
  onAttachmentSelect?: (file: File) => Promise<void> | void;
  uploadPending?: boolean;
  uploadError?: string | null;
}

function renderQuestionContent(content: string) {
  return <div className="whitespace-pre-wrap text-base leading-7 text-text-strong">{content}</div>;
}

function reviewAccentClass(isCorrect: boolean) {
  return isCorrect
    ? "border-[var(--color-success)]/25 bg-success-soft"
    : "border-[var(--color-danger)]/25 bg-danger-soft";
}

export function QuestionRenderer({
  question,
  mode,
  value = "",
  onValueChange,
  reviewData,
  attachmentUrl,
  onAttachmentSelect,
  uploadPending = false,
  uploadError,
}: QuestionRendererProps) {
  const choiceGroupName = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const isReadonly = mode === "readonly";
  const isReview = mode === "review";
  const isSubjective = question.type === "calculation" || question.type === "short_answer";
  const hasReviewState = isReview && typeof reviewData?.score === "number";
  const maxScore = question.score;

  return (
    <article className="space-y-5 rounded-[24px] border border-border bg-bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          {renderQuestionContent(question.content)}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ai">{question.score} 分</Badge>
            {(question.knowledgePoints ?? []).map((point) => (
              <Badge key={point} variant="knowledge">
                {point}
              </Badge>
            ))}
          </div>
        </div>

        {isReview && typeof reviewData?.isCorrect === "boolean" && !isSubjective ? (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
              reviewData.isCorrect
                ? "border-[var(--color-success)]/20 bg-success-soft text-success"
                : "border-[var(--color-danger)]/20 bg-danger-soft text-danger"
            )}
          >
            {reviewData.isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {reviewData.isCorrect ? "回答正确" : "回答错误"}
          </div>
        ) : null}
      </div>

      {question.type === "choice" ? (
        <div className="space-y-3">
          {(question.options ?? []).map((option, index) => {
            const checked = value === option;
            const label = String.fromCharCode(65 + index);
            return (
              <label
                key={`${question.id}-${option}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                  checked
                    ? "border-[var(--color-primary)] bg-primary-soft"
                    : "border-border bg-bg-elevated",
                  isReadonly && "cursor-default opacity-80",
                  isReview && typeof reviewData?.isCorrect === "boolean" && reviewAccentClass(reviewData.isCorrect)
                )}
              >
                <input
                  type="radio"
                  name={choiceGroupName}
                  value={option}
                  checked={checked}
                  disabled={isReadonly}
                  onChange={(event) => onValueChange?.(event.target.value)}
                  className="sr-only"
                />
                <span className="mt-0.5 text-text-subtle">
                  {checked ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-text-strong">{label}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-text-default">{option}</p>
                </div>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.type === "fill" ? (
        <Input
          value={value}
          disabled={isReadonly}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={isReadonly ? "未作答" : "请输入答案"}
          className={cn(isReview && reviewData ? reviewAccentClass(reviewData.isCorrect ?? false) : "")}
        />
      ) : null}

      {isSubjective ? (
        <div className="space-y-4">
          <textarea
            value={value}
            disabled={isReadonly}
            onChange={(event) => onValueChange?.(event.target.value)}
            placeholder={isReadonly ? "未作答" : "请输入解题过程或答案"}
            className={cn(
              "min-h-[120px] w-full rounded-2xl border border-border bg-bg-card px-4 py-3 text-sm text-text-default shadow-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-80",
              isReview && hasReviewState ? reviewAccentClass(reviewData?.isCorrect ?? false) : ""
            )}
          />

          {mode === "answer" ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onAttachmentSelect?.(file);
                  }
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadonly || uploadPending}
                >
                  <Upload className="size-4" />
                  {uploadPending ? "上传中..." : "上传图片"}
                </Button>
                <span className="text-xs text-text-muted">仅支持 png/jpg/jpeg，最大 5MB</span>
              </div>
              {attachmentUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated p-2">
                  <img
                    src={attachmentUrl}
                    alt="答题附件"
                    className="h-32 w-auto rounded-xl object-cover"
                  />
                </div>
              ) : null}
              {uploadError ? <p className="text-sm text-danger">{uploadError}</p> : null}
            </div>
          ) : null}

          {isReview && attachmentUrl ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              查看答题图片
            </a>
          ) : null}
        </div>
      ) : null}

      {isReview ? (
        <div className="space-y-3 rounded-2xl border border-border bg-bg-elevated p-4">
          {isSubjective ? (
            <p className="text-sm font-semibold text-text-strong">
              得分: {reviewData?.score ?? 0}/{maxScore}
            </p>
          ) : null}

          {!isSubjective && !reviewData?.isCorrect && reviewData?.correctAnswer ? (
            <p className="text-sm text-text-default">
              正确答案: <span className="font-semibold text-text-strong">{reviewData.correctAnswer}</span>
            </p>
          ) : null}

          {!isSubjective && reviewData?.feedback ? (
            <p className="text-sm leading-6 text-text-default">{reviewData.feedback}</p>
          ) : null}

          {isSubjective && reviewData?.teacherComment ? (
            <p className="text-sm leading-6 text-text-default">
              教师批注: {reviewData.teacherComment}
            </p>
          ) : null}

          {reviewData?.explanation ? (
            <div className="rounded-2xl border border-border bg-bg-card">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-strong"
                onClick={() => setExplanationOpen((open) => !open)}
              >
                <span>查看解析</span>
                <ChevronDown
                  className={cn("size-4 transition", explanationOpen && "rotate-180")}
                />
              </button>
              {explanationOpen ? (
                <div className="border-t border-border px-4 py-3 text-sm leading-6 text-text-default">
                  {reviewData.explanation}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
