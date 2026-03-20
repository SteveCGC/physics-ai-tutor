"use client";

export type DraftAnswer = {
  value: string;
  attachmentUrl?: string | null;
};

export type AssignmentDraft = {
  examId: string;
  updatedAt: string;
  answers: Record<string, DraftAnswer>;
};

const STORAGE_PREFIX = "student-assignment-draft:";

function getStorageKey(examId: string) {
  return `${STORAGE_PREFIX}${examId}`;
}

export function readAssignmentDraft(examId: string): AssignmentDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getStorageKey(examId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AssignmentDraft;
  } catch {
    window.localStorage.removeItem(getStorageKey(examId));
    return null;
  }
}

export function writeAssignmentDraft(draft: AssignmentDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(draft.examId), JSON.stringify(draft));
}

export function clearAssignmentDraft(examId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getStorageKey(examId));
}

export function hasAnsweredDraft(draft: AssignmentDraft | null) {
  if (!draft) {
    return false;
  }

  return Object.values(draft.answers).some(
    (answer) => Boolean(answer.value.trim()) || Boolean(answer.attachmentUrl)
  );
}
