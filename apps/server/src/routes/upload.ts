import { AwsClient } from "aws4fetch";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { Db } from "../db/client";
import { classes, documents, profiles, type Profile, documentFileTypes } from "../db/schema";
import { requireRole } from "../middleware/role";
import { parseAndStoreDocument } from "../services/document-parser";
import type { AppContext, Bindings } from "../types";

const uploadRoute = new Hono<AppContext>();

const BUCKET_CONFIG = {
  "lesson-plans": {
    maxBytes: 20 * 1024 * 1024,
    allowedExtensions: ["pdf", "docx", "pptx"] as const,
  },
  "question-banks": {
    maxBytes: 20 * 1024 * 1024,
    allowedExtensions: ["pdf", "docx", "xlsx"] as const,
  },
  "student-uploads": {
    maxBytes: 5 * 1024 * 1024,
    allowedExtensions: ["png", "jpg", "jpeg"] as const,
  },
  avatars: {
    maxBytes: 2 * 1024 * 1024,
    allowedExtensions: ["png", "jpg", "jpeg"] as const,
  },
  exports: {
    maxBytes: 20 * 1024 * 1024,
    allowedExtensions: [] as const,
  },
} as const;

const PresignSchema = z.object({
  filename: z.string().min(1, "文件名不能为空"),
  contentType: z.string().min(1, "Content-Type 不能为空"),
  bucket: z.enum(["lesson-plans", "question-banks"]),
});

const ConfirmSchema = z.object({
  fileKey: z.string().min(1, "fileKey 不能为空"),
  bucket: z.enum(["lesson-plans", "question-banks"]),
  title: z.string().trim().min(1, "标题不能为空"),
  fileType: z.enum(documentFileTypes),
  useCase: z.enum(["question_bank", "lesson_plan"]),
});

type BucketName = keyof typeof BUCKET_CONFIG;

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status });
}

function getFirstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数错误";
}

function getFileExtension(filename: string) {
  const extension = filename.trim().toLowerCase().split(".").pop();
  if (!extension || extension === filename.trim().toLowerCase()) {
    return "";
  }

  return extension;
}

function hasUnsafeFilename(filename: string) {
  return filename.includes("/") || filename.includes("\\") || filename.trim() === "";
}

type FileLike = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isFileLike(value: unknown): value is FileLike {
  if (!value || typeof value === "string") {
    return false;
  }

  return (
    typeof value === "object" &&
    "name" in value &&
    "size" in value &&
    "type" in value &&
    "arrayBuffer" in value
  );
}

function validateFileForBucket(bucket: BucketName, filename: string, sizeBytes?: number) {
  if (hasUnsafeFilename(filename)) {
    return "文件名不合法";
  }

  const extension = getFileExtension(filename);
  const config = BUCKET_CONFIG[bucket];

  if (config.allowedExtensions.length > 0 && !config.allowedExtensions.includes(extension as never)) {
    return `不支持的文件格式: .${extension || "unknown"}`;
  }

  if (typeof sizeBytes === "number" && sizeBytes > config.maxBytes) {
    return `文件大小超过限制，当前 bucket 最大支持 ${Math.floor(config.maxBytes / 1024 / 1024)}MB`;
  }

  return null;
}

function buildFileKey(userId: string, filename: string) {
  return `${userId}/${Date.now()}_${filename}`;
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getBucket(env: Bindings, name: string): R2Bucket | null {
  const buckets: Record<BucketName, R2Bucket> = {
    "lesson-plans": env.LESSON_PLANS,
    "question-banks": env.QUESTION_BANKS,
    "student-uploads": env.STUDENT_UPLOADS,
    exports: env.EXPORTS,
    avatars: env.AVATARS,
  };

  return name in buckets ? buckets[name as BucketName] : null;
}

export async function canAccessFile(profile: Profile, bucket: string, key: string, db: Db) {
  if (key.startsWith(`${profile.id}/`)) {
    return true;
  }

  if (bucket === "avatars") {
    return true;
  }

  if (bucket !== "student-uploads" || profile.role !== "teacher") {
    return false;
  }

  const ownerId = key.split("/")[0];
  if (!ownerId) {
    return false;
  }

  const [matchedStudent] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(
      classes,
      and(eq(classes.id, profiles.classId), eq(classes.teacherId, profile.id))
    )
    .where(and(eq(profiles.id, ownerId), eq(profiles.role, "student")));

  return Boolean(matchedStudent);
}

function ensureDirectUploadAllowed(profile: Profile, bucket: BucketName) {
  if (bucket === "lesson-plans" || bucket === "question-banks") {
    return profile.role === "teacher";
  }

  if (bucket === "exports") {
    return false;
  }

  return true;
}

uploadRoute.post("/upload/presign", requireRole("teacher"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = PresignSchema.safeParse(body);

  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const validationError = validateFileForBucket(result.data.bucket, result.data.filename);
  if (validationError) {
    return jsonError(validationError, 400, "INVALID_FILE");
  }

  const profile = c.get("profile");
  const fileKey = buildFileKey(profile.id, result.data.filename.trim());
  const uploadUrl = `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${result.data.bucket}/${encodeObjectKey(fileKey)}`;
  const client = new AwsClient({
    accessKeyId: c.env.R2_ACCESS_KEY_ID,
    secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const signedRequest = await client.sign(
    new Request(uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": result.data.contentType,
      },
    }),
    {
      aws: {
        signQuery: true,
      },
      expires: 600,
    }
  );

  return c.json({
    uploadUrl: signedRequest.url,
    fileKey,
  });
});

uploadRoute.post("/upload/direct", requireRole("teacher", "student"), async (c) => {
  const profile = c.get("profile");
  const formData = await c.req.raw.formData().catch(() => null);

  if (!formData) {
    return jsonError("请求必须是 multipart/form-data", 400, "BAD_REQUEST");
  }

  const bucket = formData.get("bucket");
  const file = formData.get("file");

  if (typeof bucket !== "string" || !(bucket in BUCKET_CONFIG)) {
    return jsonError("非法 bucket", 400, "INVALID_BUCKET");
  }

  if (!isFileLike(file)) {
    return jsonError("缺少文件", 400, "BAD_REQUEST");
  }

  const bucketName = bucket as BucketName;
  if (!ensureDirectUploadAllowed(profile, bucketName)) {
    return jsonError("无权限上传到该 bucket", 403, "FORBIDDEN");
  }

  const validationError = validateFileForBucket(bucketName, file.name, file.size);
  if (validationError) {
    return jsonError(validationError, 400, "INVALID_FILE");
  }

  const r2Bucket = getBucket(c.env, bucketName);
  if (!r2Bucket) {
    return jsonError("Bucket 未配置", 400, "INVALID_BUCKET");
  }

  const fileKey = buildFileKey(profile.id, file.name.trim());
  await r2Bucket.put(fileKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || undefined,
    },
    customMetadata: {
      uploadedBy: profile.id,
      originalName: file.name,
    },
  });

  return c.json({
    fileKey,
    fileUrl: `/api/files/${bucketName}/${fileKey}`,
  });
});

uploadRoute.post("/upload/confirm", requireRole("teacher"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = ConfirmSchema.safeParse(body);

  if (!result.success) {
    return jsonError(getFirstZodError(result.error), 400, "BAD_REQUEST");
  }

  const { bucket, fileKey, fileType, title, useCase } = result.data;
  const profile = c.get("profile");

  if (!fileKey.startsWith(`${profile.id}/`)) {
    return jsonError("只能确认自己的文件", 403, "FORBIDDEN");
  }

  if (bucket === "lesson-plans" && useCase !== "lesson_plan") {
    return jsonError("lesson-plans 仅支持 lesson_plan", 400, "BAD_REQUEST");
  }

  if (bucket === "question-banks" && useCase !== "question_bank") {
    return jsonError("question-banks 仅支持 question_bank", 400, "BAD_REQUEST");
  }

  const validationError = validateFileForBucket(bucket, fileKey.split("/").pop() ?? "");
  if (validationError) {
    return jsonError(validationError, 400, "INVALID_FILE");
  }

  const r2Bucket = getBucket(c.env, bucket);
  if (!r2Bucket) {
    return jsonError("Bucket 未配置", 400, "INVALID_BUCKET");
  }

  const existingObject = await r2Bucket.head(fileKey);
  if (!existingObject) {
    return jsonError("文件不存在", 404, "FILE_NOT_FOUND");
  }

  const db = c.get("db");
  const [createdDocument] = await db
    .insert(documents)
    .values({
      teacherId: profile.id,
      title,
      fileUrl: `/api/files/${bucket}/${fileKey}`,
      fileType,
      useCase,
      parseStatus: "pending",
    })
    .returning({
      id: documents.id,
    });

  const parseTask = parseAndStoreDocument({
    db,
    documentId: createdDocument.id,
    r2Bucket,
    fileKey,
    fileType,
  });

  c.executionCtx.waitUntil(parseTask);

  return c.json({
    id: createdDocument.id,
    status: "parsing",
  });
});

uploadRoute.get("/files/:bucket/*", requireRole("teacher", "student"), async (c) => {
  const bucket = c.req.param("bucket");
  const key = c.req.param("*");

  if (!(bucket in BUCKET_CONFIG) || !key) {
    return jsonError("文件不存在", 404, "FILE_NOT_FOUND");
  }

  const bucketName = bucket as BucketName;
  const db = c.get("db");
  const profile = c.get("profile");
  const allowed = await canAccessFile(profile, bucketName, key, db);

  if (!allowed) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const r2Bucket = getBucket(c.env, bucketName);
  if (!r2Bucket) {
    return jsonError("Bucket 未配置", 400, "INVALID_BUCKET");
  }

  const object = await r2Bucket.get(key);
  if (!object) {
    return jsonError("文件不存在", 404, "FILE_NOT_FOUND");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=3600");

  return new Response(object.body, {
    status: 200,
    headers,
  });
});

export default uploadRoute;
