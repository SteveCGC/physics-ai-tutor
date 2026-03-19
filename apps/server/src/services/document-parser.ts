import { eq } from "drizzle-orm";
import { unzipSync } from "fflate";

import { documents, documentFileTypes } from "../db/schema";
import type { Db } from "../db/client";

type SupportedDocumentFileType = (typeof documentFileTypes)[number];

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function parsePdf(buffer: ArrayBuffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const result = await pdfParse(new Uint8Array(buffer));
  return normalizeWhitespace(result.text ?? "");
}

async function parseDocx(buffer: ArrayBuffer) {
  const mammothModule = await import("mammoth");
  const mammoth = mammothModule.default ?? mammothModule;
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return normalizeWhitespace(result.value ?? "");
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parsePptx(buffer: ArrayBuffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const textDecoder = new TextDecoder();
  const slideEntries = Object.keys(archive)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const rightNumber = Number(right.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return leftNumber - rightNumber;
    });

  const slides = slideEntries
    .map((entry) => {
      const xml = textDecoder.decode(archive[entry]);
      const texts = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
        .map((match) => decodeXmlEntities(match[1] ?? "").trim())
        .filter(Boolean);

      return texts.join(" ");
    })
    .filter(Boolean);

  return normalizeWhitespace(slides.join("\n\n"));
}

export async function parseDocument(
  r2Bucket: R2Bucket,
  fileKey: string,
  fileType: SupportedDocumentFileType
): Promise<string> {
  const object = await r2Bucket.get(fileKey);
  if (!object) {
    throw new Error("File not found in R2");
  }

  const buffer = await object.arrayBuffer();

  switch (fileType) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "pptx":
      return parsePptx(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

type ParseAndStoreDocumentOptions = {
  db: Db;
  documentId: string;
  r2Bucket: R2Bucket;
  fileKey: string;
  fileType: SupportedDocumentFileType;
};

export async function parseAndStoreDocument({
  db,
  documentId,
  r2Bucket,
  fileKey,
  fileType,
}: ParseAndStoreDocumentOptions) {
  try {
    const parsedContent = await parseDocument(r2Bucket, fileKey, fileType);

    await db
      .update(documents)
      .set({
        parsedContent,
        parseStatus: "done",
      })
      .where(eq(documents.id, documentId));
  } catch (error) {
    console.error("[Document Parser] Failed to parse document", {
      documentId,
      fileKey,
      fileType,
      error,
    });

    await db
      .update(documents)
      .set({
        parseStatus: "failed",
      })
      .where(eq(documents.id, documentId));
  }
}
