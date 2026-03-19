import type { Question } from "../db/schema";

type ObjectiveGradeResult = {
  isCorrect: boolean;
  score: number;
  feedback: string | null;
};

const fullWidthMap: Record<string, string> = {
  "，": ",",
  "。": ".",
  "：": ":",
  "；": ";",
  "（": "(",
  "）": ")",
  "【": "[",
  "】": "]",
  "＋": "+",
  "－": "-",
  "＝": "=",
  "＊": "*",
  "／": "/",
  "％": "%",
};

const unitAliasRules: Array<[RegExp, string]> = [
  [/m[·*]s\^-?2/g, "m/s^2"],
  [/m[·*]s-2/g, "m/s^2"],
  [/m\/s2/g, "m/s^2"],
  [/m\/s\^?2/g, "m/s^2"],
  [/m[·*]s\^-?1/g, "m/s"],
  [/m[·*]s-1/g, "m/s"],
  [/m\/s\^?1/g, "m/s"],
  [/km[·*]h\^-?1/g, "km/h"],
  [/km[·*]h-1/g, "km/h"],
  [/kg[·*]m\^-?3/g, "kg/m^3"],
  [/kg[·*]m-3/g, "kg/m^3"],
  [/g[·*]cm\^-?3/g, "g/cm^3"],
  [/g[·*]cm-3/g, "g/cm^3"],
  [/n\*m/g, "n·m"],
  [/pa\*s/g, "pa·s"],
  [/kw[h]/g, "kw·h"],
  [/kwh/g, "kw·h"],
  [/w[·*]h/g, "w·h"],
  [/v[·*]m\^-?1/g, "v/m"],
  [/v[·*]m-1/g, "v/m"],
  [/a[·*]m\^-?1/g, "a/m"],
  [/a[·*]m-1/g, "a/m"],
  [/c[·*]kg\^-?1/g, "c/kg"],
  [/c[·*]kg-1/g, "c/kg"],
  [/j[\/]kg[·*]k/g, "j/(kg·k)"],
  [/j[\/]kg[·*]°c/g, "j/(kg·°c)"],
  [/n[\/]kg/g, "n/kg"],
  [/kg[·*]m\/s/g, "kg·m/s"],
  [/kg[·*]m[·*]s\^-?1/g, "kg·m/s"],
  [/kg[·*]m[·*]s-1/g, "kg·m/s"],
];

function normalizeCommon(input: string): string {
  return input
    .trim()
    .replace(/[，。：；（）【】＋－＝＊／％]/g, (char) => fullWidthMap[char] ?? char)
    .replace(/℃/g, "°c")
    .replace(/[⁰]/g, "0")
    .replace(/[¹]/g, "1")
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/[⁴]/g, "4")
    .replace(/[⁵]/g, "5")
    .replace(/[⁶]/g, "6")
    .replace(/[⁷]/g, "7")
    .replace(/[⁸]/g, "8")
    .replace(/[⁹]/g, "9")
    .replace(/[⁻]/g, "-")
    .replace(/[·•⋅]/g, "·")
    .replace(/[×]/g, "*")
    .replace(/[μµ]/g, "u")
    .replace(/[Ω]/g, "ω")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeFillAnswer(input: string): string {
  let normalized = normalizeCommon(input)
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*\*\s*/g, "*")
    .replace(/\s*·\s*/g, "·")
    .replace(/\s*\^\s*/g, "^")
    .replace(/\s*-\s*(\d+)/g, "-$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*\.\s*/g, ".")
    .trim();

  for (const [pattern, replacement] of unitAliasRules) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}

function createChoiceFeedback(question: Question) {
  if (!question.explanation) {
    return `正确答案为 ${question.answer}`;
  }

  return `正确答案为 ${question.answer}，${question.explanation.slice(0, 100)}`;
}

export function gradeObjectiveQuestion(
  question: Pick<Question, "type" | "answer" | "acceptedAnswers" | "score" | "explanation">,
  studentAnswer: string
): ObjectiveGradeResult {
  if (question.type === "choice") {
    const isCorrect = studentAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    return {
      isCorrect,
      score: isCorrect ? question.score : 0,
      feedback: isCorrect ? null : createChoiceFeedback(question as Question),
    };
  }

  if (question.type === "fill") {
    const normalizedStudentAnswer = normalizeFillAnswer(studentAnswer);
    const candidates = [question.answer, ...(question.acceptedAnswers ?? [])]
      .filter((item): item is string => Boolean(item))
      .map((item) => normalizeFillAnswer(item));

    const isCorrect = candidates.includes(normalizedStudentAnswer);
    return {
      isCorrect,
      score: isCorrect ? question.score : 0,
      feedback: isCorrect ? null : `参考答案为 ${question.answer}，注意单位和表达格式`,
    };
  }

  return {
    isCorrect: false,
    score: 0,
    feedback: null,
  };
}
