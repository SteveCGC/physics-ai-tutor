import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { Hono } from "hono";

import { classes, exams, profiles, questions, submissions } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { AppContext } from "../types";

const teacherRoute = new Hono<AppContext>();

teacherRoute.use("/teacher/*", requireRole("teacher"));

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

teacherRoute.get("/teacher/stats", async (c) => {
  const db = c.get("db");
  const profile = c.get("profile");
  const startOfWeek = getStartOfWeek(new Date());

  const teacherClasses = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.teacherId, profile.id));

  const classIds = teacherClasses.map((item) => item.id);

  const [
    pendingGradeResult,
    weeklyQuestionResult,
    publishedExamResult,
    studentCountResult,
  ] = await Promise.all([
    db
      .select({ count: count(submissions.id) })
      .from(submissions)
      .innerJoin(exams, eq(exams.id, submissions.examId))
      .where(
        and(eq(exams.teacherId, profile.id), eq(submissions.status, "pending_review"))
      ),
    db
      .select({ count: count(questions.id) })
      .from(questions)
      .innerJoin(exams, eq(exams.id, questions.examId))
      .where(and(eq(exams.teacherId, profile.id), gte(questions.createdAt, startOfWeek))),
    db
      .select({ count: count(exams.id) })
      .from(exams)
      .where(and(eq(exams.teacherId, profile.id), eq(exams.status, "published"))),
    classIds.length > 0
      ? db
          .select({ count: count(profiles.id) })
          .from(profiles)
          .where(
            and(eq(profiles.role, "student"), inArray(profiles.classId, classIds))
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  return c.json({
    pendingGradeCount: Number(pendingGradeResult[0]?.count ?? 0),
    weeklyQuestionCount: Number(weeklyQuestionResult[0]?.count ?? 0),
    publishedExamCount: Number(publishedExamResult[0]?.count ?? 0),
    studentCount: Number(studentCountResult[0]?.count ?? 0),
  });
});

export default teacherRoute;
