import type { QuestionType } from "@physics-ai-tutor/shared";

export class QuestionGeneratorUnavailableError extends Error {
  constructor() {
    super("Question generator is unavailable");
    this.name = "QuestionGeneratorUnavailableError";
  }
}

export type RegenerateQuestionInput = {
  knowledgePoints: string[];
  type: QuestionType;
  difficulty: number;
};

export type RegeneratedQuestion = {
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation?: string | null;
  knowledgePoints: string[];
  difficulty: number;
  score: number;
};

export async function regenerateQuestionWithMastra(
  _input: RegenerateQuestionInput
): Promise<RegeneratedQuestion> {
  throw new QuestionGeneratorUnavailableError();
}
