export type QuestionType = "choice" | "fill" | "calculation" | "short_answer";

export type QuestionSource = "ai" | "manual" | "imported";

export interface QualityFlag {
  type: string;
  message: string;
  severity: "warning" | "error";
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  content: string;
  options: string[] | null;
  answer: string;
  acceptedAnswers: string[] | null;
  explanation: string | null;
  knowledgePoints: string[] | null;
  difficulty: number;
  score: number;
  orderIndex: number;
  source: QuestionSource;
  qualityFlags: QualityFlag[] | null;
  createdAt: string;
}
