ALTER TABLE "answers" DROP CONSTRAINT "answers_graded_by_check";--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "graded_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "graded_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_graded_by_check" CHECK ("answers"."graded_by" is null or "answers"."graded_by" in ('auto', 'teacher'));