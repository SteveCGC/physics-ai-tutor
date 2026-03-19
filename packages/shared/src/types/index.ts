// ============================================================
// 共享类型定义 — physics-ai-tutor
// ============================================================

export * from "./exam";
export * from "./question";

// 用户角色
export type UserRole = "teacher" | "student";

// 用户状态
export type UserStatus = "active" | "disabled";

// 用户信息
export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  avatar: string | null;
  phone: string | null;
  school: string | null;
  classId: string | null; // 学生所属班级（一对一）
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 班级
export interface Class {
  id: string;
  name: string;
  grade: string;
  teacherId: string;
  inviteCode: string;
  createdAt: string;
}

// 答题提交状态
export type SubmissionStatus =
  | "in_progress"
  | "submitted"
  | "pending_review"
  | "published";

// 答题提交
export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  status: SubmissionStatus;
  totalScore: number | null;
  submittedAt: string | null;
  publishedAt: string | null;
}

// 批改人
export type GradedBy = "auto" | "teacher";

// 单题作答
export interface Answer {
  id: string;
  submissionId: string;
  questionId: string;
  studentAnswer: string | null;
  attachmentUrl: string | null; // R2 key
  isCorrect: boolean | null;
  score: number | null;
  feedback: string | null;
  teacherComment: string | null;
  gradedBy: GradedBy | null;
  gradedAt: string | null;
}

// 成绩审计日志
export interface ScoreAuditLog {
  id: string;
  submissionId: string;
  answerId: string;
  operatorId: string;
  oldScore: number;
  newScore: number;
  oldComment: string | null;
  newComment: string | null;
  reason: string;
  createdAt: string;
}

// 文件用途
export type DocumentUseCase = "question_bank" | "lesson_plan";

// 文件解析状态
export type ParseStatus = "pending" | "done" | "failed";

// 上传文件
export interface Document {
  id: string;
  teacherId: string;
  title: string;
  fileUrl: string; // R2 key
  fileType: "pdf" | "docx" | "pptx" | null;
  parsedContent: string | null;
  useCase: DocumentUseCase;
  parseStatus: ParseStatus;
  knowledgePoints: string[] | null;
  createdAt: string;
}

// API 统一错误响应
export interface ApiError {
  error: string;
  code?: string;
}
