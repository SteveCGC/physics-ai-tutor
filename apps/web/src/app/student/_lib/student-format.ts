"use client";

import type { SubmissionStatus } from "@physics-ai-tutor/shared";

export type StudentAssignmentStatus = SubmissionStatus | "not_started";

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

export function formatCountdown(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return "00:00:00";
  }

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function getStudentAssignmentStatus(
  submissionStatus: SubmissionStatus | null,
  hasDraft: boolean
): StudentAssignmentStatus {
  if (submissionStatus) {
    return submissionStatus;
  }

  return hasDraft ? "in_progress" : "not_started";
}
