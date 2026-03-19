export type ExamStatus = "draft" | "published" | "archived";

export interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  teacherId: string;
  classId: string;
  knowledgePoints: string[] | null;
  totalScore: number | null;
  deadline: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface ExamListResponse<TItem = Exam> {
  total: number;
  page: number;
  pageSize: number;
  items: TItem[];
}
