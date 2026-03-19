import { relations } from "drizzle-orm";

import {
  answers,
  classes,
  documents,
  exams,
  profiles,
  questions,
  scoreAuditLogs,
  submissions,
} from "./schema";

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  class: one(classes, {
    fields: [profiles.classId],
    references: [classes.id],
  }),
  teachingClasses: many(classes),
  exams: many(exams),
  submissions: many(submissions),
  scoreAuditLogs: many(scoreAuditLogs),
  documents: many(documents),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(profiles, {
    fields: [classes.teacherId],
    references: [profiles.id],
  }),
  students: many(profiles),
  exams: many(exams),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  teacher: one(profiles, {
    fields: [exams.teacherId],
    references: [profiles.id],
  }),
  class: one(classes, {
    fields: [exams.classId],
    references: [classes.id],
  }),
  questions: many(questions),
  submissions: many(submissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
  answers: many(answers),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [submissions.examId],
    references: [exams.id],
  }),
  student: one(profiles, {
    fields: [submissions.studentId],
    references: [profiles.id],
  }),
  answers: many(answers),
  scoreAuditLogs: many(scoreAuditLogs),
}));

export const answersRelations = relations(answers, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [answers.submissionId],
    references: [submissions.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  scoreAuditLogs: many(scoreAuditLogs),
}));

export const scoreAuditLogsRelations = relations(scoreAuditLogs, ({ one }) => ({
  submission: one(submissions, {
    fields: [scoreAuditLogs.submissionId],
    references: [submissions.id],
  }),
  answer: one(answers, {
    fields: [scoreAuditLogs.answerId],
    references: [answers.id],
  }),
  operator: one(profiles, {
    fields: [scoreAuditLogs.operatorId],
    references: [profiles.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  teacher: one(profiles, {
    fields: [documents.teacherId],
    references: [profiles.id],
  }),
}));
