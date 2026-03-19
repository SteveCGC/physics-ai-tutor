CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"student_answer" text,
	"attachment_url" text,
	"is_correct" boolean,
	"score" integer,
	"feedback" text,
	"teacher_comment" text,
	"graded_by" text DEFAULT 'auto' NOT NULL,
	"graded_at" timestamp with time zone,
	CONSTRAINT "answers_graded_by_check" CHECK ("answers"."graded_by" in ('auto', 'teacher'))
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"parsed_content" text,
	"use_case" text NOT NULL,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"knowledge_points" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_file_type_check" CHECK ("documents"."file_type" is null or "documents"."file_type" in ('pdf', 'docx', 'pptx')),
	CONSTRAINT "documents_use_case_check" CHECK ("documents"."use_case" in ('question_bank', 'lesson_plan')),
	CONSTRAINT "documents_parse_status_check" CHECK ("documents"."parse_status" in ('pending', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"knowledge_points" jsonb,
	"total_score" integer,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "exams_status_check" CHECK ("exams"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"phone" text,
	"school" text,
	"class_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" in ('teacher', 'student')),
	CONSTRAINT "profiles_status_check" CHECK ("profiles"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"options" jsonb,
	"answer" text NOT NULL,
	"accepted_answers" jsonb,
	"explanation" text,
	"knowledge_points" jsonb,
	"difficulty" integer NOT NULL,
	"score" integer NOT NULL,
	"order_index" integer NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"quality_flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_type_check" CHECK ("questions"."type" in ('choice', 'fill', 'calculation', 'short_answer')),
	CONSTRAINT "questions_source_check" CHECK ("questions"."source" in ('ai', 'manual', 'imported')),
	CONSTRAINT "questions_difficulty_check" CHECK ("questions"."difficulty" between 1 and 5),
	CONSTRAINT "questions_score_check" CHECK ("questions"."score" >= 0),
	CONSTRAINT "questions_order_index_check" CHECK ("questions"."order_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "score_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"answer_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"old_score" integer,
	"new_score" integer,
	"old_comment" text,
	"new_comment" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"total_score" integer,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "submissions_status_check" CHECK ("submissions"."status" in ('in_progress', 'submitted', 'pending_review', 'published'))
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "score_audit_logs" ADD CONSTRAINT "score_audit_logs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "score_audit_logs" ADD CONSTRAINT "score_audit_logs_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "score_audit_logs" ADD CONSTRAINT "score_audit_logs_operator_id_profiles_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "answers_submission_question_unique" ON "answers" USING btree ("submission_id","question_id");--> statement-breakpoint
CREATE INDEX "answers_submission_id_idx" ON "answers" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "answers_question_id_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_invite_code_unique" ON "classes" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "classes_teacher_id_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "documents_teacher_id_idx" ON "documents" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "documents_use_case_idx" ON "documents" USING btree ("use_case");--> statement-breakpoint
CREATE INDEX "exams_teacher_id_idx" ON "exams" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "exams_class_id_idx" ON "exams" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "exams_status_idx" ON "exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_class_id_idx" ON "profiles" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_exam_order_unique" ON "questions" USING btree ("exam_id","order_index");--> statement-breakpoint
CREATE INDEX "questions_exam_id_idx" ON "questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "score_audit_logs_submission_id_idx" ON "score_audit_logs" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "score_audit_logs_answer_id_idx" ON "score_audit_logs" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX "score_audit_logs_operator_id_idx" ON "score_audit_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_exam_student_unique" ON "submissions" USING btree ("exam_id","student_id");--> statement-breakpoint
CREATE INDEX "submissions_exam_id_idx" ON "submissions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "submissions_student_id_idx" ON "submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");