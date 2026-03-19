import { CreateClassSchema, JoinClassSchema, PaginationSchema } from "@physics-ai-tutor/shared";
import { and, asc, count, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";

import { classes, profiles } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { AppContext } from "../types";

const classesRoute = new Hono<AppContext>();

const IdParamSchema = z.object({
  id: z.string().uuid("班级ID格式错误"),
});

const StudentBindingParamSchema = z.object({
  classId: z.string().uuid("班级ID格式错误"),
  studentId: z.string().uuid("学生ID格式错误"),
});

const ClassStudentsPaginationSchema = PaginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
}

function parseInviteCode(rawCode: string) {
  const normalizedCode = rawCode.trim().toUpperCase();
  const result = JoinClassSchema.safeParse({ inviteCode: normalizedCode });

  if (!result.success) {
    return {
      success: false as const,
      response: jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST"),
    };
  }

  return {
    success: true as const,
    inviteCode: result.data.inviteCode,
  };
}

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function isInviteCodeUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const constraint = "constraint_name" in error ? error.constraint_name : undefined;
  const message = "message" in error ? error.message : undefined;

  return (
    code === "23505" &&
    (constraint === "classes_invite_code_unique" ||
      (typeof message === "string" && message.includes("classes_invite_code_unique")))
  );
}

type RouteContext = Context<AppContext>;

async function createUniqueInviteCode(c: RouteContext) {
  const db = c.get("db");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = generateInviteCode();
    const existingClass = await db.query.classes.findFirst({
      columns: { id: true },
      where: eq(classes.inviteCode, inviteCode),
    });

    if (!existingClass) {
      return inviteCode;
    }
  }

  throw new Error("Failed to generate unique invite code");
}

async function getOwnedClass(c: RouteContext, classId: string) {
  const db = c.get("db");
  const profile = c.get("profile");

  return db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, profile.id)),
  });
}

classesRoute.use("*", requireRole("teacher", "student"));

classesRoute.post("/", requireRole("teacher"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = CreateClassSchema.safeParse(body);

  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const profile = c.get("profile");
  const db = c.get("db");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = await createUniqueInviteCode(c);

    try {
      const [createdClass] = await db
        .insert(classes)
        .values({
          name: result.data.name,
          grade: result.data.grade,
          inviteCode,
          teacherId: profile.id,
        })
        .returning();

      return c.json(createdClass, 201);
    } catch (error) {
      if (isInviteCodeUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create class with unique invite code");
});

classesRoute.get("/", requireRole("teacher"), async (c) => {
  const db = c.get("db");
  const profile = c.get("profile");

  const result = await db
    .select({
      id: classes.id,
      name: classes.name,
      grade: classes.grade,
      inviteCode: classes.inviteCode,
      studentCount: count(profiles.id),
    })
    .from(classes)
    .leftJoin(
      profiles,
      and(eq(profiles.classId, classes.id), eq(profiles.role, "student"))
    )
    .where(eq(classes.teacherId, profile.id))
    .groupBy(classes.id)
    .orderBy(asc(classes.createdAt));

  return c.json(result);
});

classesRoute.get("/:id", requireRole("teacher"), async (c) => {
  const params = IdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const ownedClass = await getOwnedClass(c, params.data.id);
  if (!ownedClass) {
    return jsonError("班级不存在", 404, "CLASS_NOT_FOUND");
  }

  const db = c.get("db");
  const [studentCountResult] = await db
    .select({ count: count(profiles.id) })
    .from(profiles)
    .where(and(eq(profiles.classId, ownedClass.id), eq(profiles.role, "student")));

  return c.json({
    ...ownedClass,
    studentCount: studentCountResult?.count ?? 0,
  });
});

classesRoute.get("/:id/students", requireRole("teacher"), async (c) => {
  const params = IdParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const pagination = ClassStudentsPaginationSchema.safeParse(c.req.query());
  if (!pagination.success) {
    return jsonError(getFirstZodError(pagination.error), 400, "BAD_REQUEST");
  }

  const ownedClass = await getOwnedClass(c, params.data.id);
  if (!ownedClass) {
    return jsonError("班级不存在", 404, "CLASS_NOT_FOUND");
  }

  const { page, pageSize } = pagination.data;
  const offset = (page - 1) * pageSize;
  const db = c.get("db");

  const students = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      school: profiles.school,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(and(eq(profiles.classId, ownedClass.id), eq(profiles.role, "student")))
    .orderBy(asc(profiles.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json(students);
});

classesRoute.post("/join", requireRole("student"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const profile = c.get("profile");

  if (profile.classId) {
    return jsonError("已加入班级，如需换班请联系教师解绑", 400, "ALREADY_JOINED_CLASS");
  }

  if (!body || typeof body !== "object" || !("inviteCode" in body)) {
    return jsonError("请求参数错误", 400, "BAD_REQUEST");
  }

  const inviteCodeResult = parseInviteCode(String(body.inviteCode));
  if (!inviteCodeResult.success) {
    return inviteCodeResult.response;
  }

  const db = c.get("db");
  const targetClass = await db.query.classes.findFirst({
    where: eq(classes.inviteCode, inviteCodeResult.inviteCode),
  });

  if (!targetClass) {
    return jsonError("邀请码无效", 404, "INVALID_INVITE_CODE");
  }

  await db
    .update(profiles)
    .set({ classId: targetClass.id })
    .where(eq(profiles.id, profile.id));

  return c.json(targetClass);
});

classesRoute.delete("/:classId/students/:studentId", requireRole("teacher"), async (c) => {
  const params = StudentBindingParamSchema.safeParse(c.req.param());
  if (!params.success) {
    return jsonError(getFirstZodError(params.error), 400, "BAD_REQUEST");
  }

  const ownedClass = await getOwnedClass(c, params.data.classId);
  if (!ownedClass) {
    return jsonError("班级不存在", 404, "CLASS_NOT_FOUND");
  }

  const db = c.get("db");
  const student = await db.query.profiles.findFirst({
    columns: {
      id: true,
      classId: true,
      role: true,
    },
    where: and(
      eq(profiles.id, params.data.studentId),
      eq(profiles.classId, ownedClass.id),
      eq(profiles.role, "student")
    ),
  });

  if (!student) {
    return jsonError("学生不存在或不属于该班级", 404, "STUDENT_NOT_FOUND");
  }

  await db.update(profiles).set({ classId: null }).where(eq(profiles.id, student.id));

  return c.json({ success: true });
});

export default classesRoute;
