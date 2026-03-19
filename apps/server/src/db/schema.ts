import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profileRoles = ["teacher", "student"] as const;
export const profileStatuses = ["active", "disabled"] as const;
export const examStatuses = ["draft", "published", "archived"] as const;
export const questionTypes = ["choice", "fill", "calculation", "short_answer"] as const;
export const questionSources = ["ai", "manual", "imported"] as const;
export const submissionStatuses = [
  "in_progress",
  "submitted",
  "pending_review",
  "published",
] as const;
export const answerGraders = ["auto", "teacher"] as const;
export const documentUseCases = ["question_bank", "lesson_plan"] as const;
export const documentParseStatuses = ["pending", "done", "failed"] as const;
export const documentFileTypes = ["pdf", "docx", "pptx"] as const;

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
};

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    role: text("role").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
    phone: text("phone"),
    school: text("school"),
    classId: uuid("class_id").references((): AnyPgColumn => classes.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    status: text("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (table) => [
    check("profiles_role_check", sql`${table.role} in ('teacher', 'student')`),
    check("profiles_status_check", sql`${table.status} in ('active', 'disabled')`),
    index("profiles_class_id_idx").on(table.classId),
    index("profiles_role_idx").on(table.role),
  ]
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references((): AnyPgColumn => profiles.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    inviteCode: text("invite_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("classes_invite_code_unique").on(table.inviteCode),
    index("classes_teacher_id_idx").on(table.teacherId),
  ]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    knowledgePoints: jsonb("knowledge_points").$type<string[]>(),
    totalScore: integer("total_score"),
    deadline: timestamp("deadline", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check("exams_status_check", sql`${table.status} in ('draft', 'published', 'archived')`),
    index("exams_teacher_id_idx").on(table.teacherId),
    index("exams_class_id_idx").on(table.classId),
    index("exams_status_idx").on(table.status),
  ]
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    type: text("type").notNull(),
    content: text("content").notNull(),
    options: jsonb("options").$type<string[]>(),
    answer: text("answer").notNull(),
    acceptedAnswers: jsonb("accepted_answers").$type<string[]>(),
    explanation: text("explanation"),
    knowledgePoints: jsonb("knowledge_points").$type<string[]>(),
    difficulty: integer("difficulty").notNull(),
    score: integer("score").notNull(),
    orderIndex: integer("order_index").notNull(),
    source: text("source").notNull().default("ai"),
    qualityFlags: jsonb("quality_flags").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "questions_type_check",
      sql`${table.type} in ('choice', 'fill', 'calculation', 'short_answer')`
    ),
    check("questions_source_check", sql`${table.source} in ('ai', 'manual', 'imported')`),
    check("questions_difficulty_check", sql`${table.difficulty} between 1 and 5`),
    check("questions_score_check", sql`${table.score} >= 0`),
    check("questions_order_index_check", sql`${table.orderIndex} >= 0`),
    uniqueIndex("questions_exam_order_unique").on(table.examId, table.orderIndex),
    index("questions_exam_id_idx").on(table.examId),
  ]
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: text("status").notNull().default("in_progress"),
    totalScore: integer("total_score"),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check(
      "submissions_status_check",
      sql`${table.status} in ('in_progress', 'submitted', 'pending_review', 'published')`
    ),
    uniqueIndex("submissions_exam_student_unique").on(table.examId, table.studentId),
    index("submissions_exam_id_idx").on(table.examId),
    index("submissions_student_id_idx").on(table.studentId),
    index("submissions_status_idx").on(table.status),
  ]
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    studentAnswer: text("student_answer"),
    attachmentUrl: text("attachment_url"),
    isCorrect: boolean("is_correct"),
    score: integer("score"),
    feedback: text("feedback"),
    teacherComment: text("teacher_comment"),
    gradedBy: text("graded_by"),
    gradedAt: timestamp("graded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check(
      "answers_graded_by_check",
      sql`${table.gradedBy} is null or ${table.gradedBy} in ('auto', 'teacher')`
    ),
    uniqueIndex("answers_submission_question_unique").on(table.submissionId, table.questionId),
    index("answers_submission_id_idx").on(table.submissionId),
    index("answers_question_id_idx").on(table.questionId),
  ]
);

export const scoreAuditLogs = pgTable(
  "score_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => profiles.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    oldScore: integer("old_score"),
    newScore: integer("new_score"),
    oldComment: text("old_comment"),
    newComment: text("new_comment"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("score_audit_logs_submission_id_idx").on(table.submissionId),
    index("score_audit_logs_answer_id_idx").on(table.answerId),
    index("score_audit_logs_operator_id_idx").on(table.operatorId),
  ]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: text("title").notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type"),
    parsedContent: text("parsed_content"),
    useCase: text("use_case").notNull(),
    parseStatus: text("parse_status").notNull().default("pending"),
    knowledgePoints: jsonb("knowledge_points").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "documents_file_type_check",
      sql`${table.fileType} is null or ${table.fileType} in ('pdf', 'docx', 'pptx')`
    ),
    check(
      "documents_use_case_check",
      sql`${table.useCase} in ('question_bank', 'lesson_plan')`
    ),
    check(
      "documents_parse_status_check",
      sql`${table.parseStatus} in ('pending', 'done', 'failed')`
    ),
    index("documents_teacher_id_idx").on(table.teacherId),
    index("documents_use_case_idx").on(table.useCase),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
export type ScoreAuditLog = typeof scoreAuditLogs.$inferSelect;
export type NewScoreAuditLog = typeof scoreAuditLogs.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
